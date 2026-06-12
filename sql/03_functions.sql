-- ============================================================
-- 03_functions.sql  |  Secure Personal Finance Platform
-- Run AFTER 02_views.sql
--
-- Functions listed:
--   1. transfer_money()       — ACID fund transfer
--   2. check_fraud()          — post-transfer fraud rules
--   3. get_risk_score()       — on-demand risk score (3NF)
--   4. dashboard_summary()    — user dashboard metrics
--   5. admin_platform_stats() — admin overview metrics
-- ============================================================

-- ── 1. transfer_money ────────────────────────────────────────
-- Atomically moves p_amount from one account to another.
-- Uses SELECT … FOR UPDATE to lock both rows and prevent
-- race conditions (REPEATABLE READ isolation).
-- Inserts a Transactions record on success.
-- The fraud check trigger fires AFTER the INSERT.
CREATE OR REPLACE FUNCTION transfer_money(
    p_from_acc  INT,
    p_to_acc    INT,
    p_amount    NUMERIC,
    p_desc      TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql AS $$
DECLARE
    v_bal    NUMERIC;
    v_frozen CHAR(1);
BEGIN
    -- Lock source account and read balance
    SELECT balance, is_frozen
    INTO   v_bal, v_frozen
    FROM   Accounts
    WHERE  account_id = p_from_acc
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source account % not found', p_from_acc;
    END IF;
    IF v_frozen = 'Y' THEN
        RAISE EXCEPTION 'Source account % is frozen', p_from_acc;
    END IF;
    IF v_bal < p_amount THEN
        RAISE EXCEPTION 'Insufficient funds. Balance: %, Required: %',
                         v_bal, p_amount;
    END IF;

    -- Lock destination account
    PERFORM account_id
    FROM    Accounts
    WHERE   account_id = p_to_acc
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Destination account % not found', p_to_acc;
    END IF;

    -- Debit source, credit destination
    UPDATE Accounts SET balance = balance - p_amount
    WHERE  account_id = p_from_acc;

    UPDATE Accounts SET balance = balance + p_amount
    WHERE  account_id = p_to_acc;

    -- Record the transaction (triggers fire after this)
    INSERT INTO Transactions(from_acc_id, to_acc_id, amount,
                             txn_type, status, description)
    VALUES (p_from_acc, p_to_acc, p_amount,
            'TRANSFER', 'SUCCESS', p_desc);

    RETURN 'SUCCESS';

EXCEPTION
    WHEN OTHERS THEN
        RAISE;   -- caller handles rollback
END;
$$;


-- ── 2. check_fraud ───────────────────────────────────────────
-- Called by the post-transfer trigger trg_post_transfer_fraud.
-- Applies two rule-based heuristics:
--   Rule 1 — Amount > 3× the user's 30-day average.
--   Rule 2 — Burst: 5+ transactions within 10 minutes.
--
-- 3NF note: user_id is derived via FK chain inside this
-- function; it is NOT stored in FraudAlerts.
CREATE OR REPLACE FUNCTION check_fraud(p_txn_id INT)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_amount   NUMERIC;
    v_user_id  INT;
    v_avg_amt  NUMERIC;
    v_burst_ct INT;
    v_severity VARCHAR(10) := NULL;
    v_reason   TEXT        := '';
BEGIN
    -- Derive the transacting user via FK chain (3NF compliant)
    SELECT t.amount, a.user_id
    INTO   v_amount, v_user_id
    FROM   Transactions t
    JOIN   Accounts     a ON a.account_id = t.from_acc_id
    WHERE  t.txn_id = p_txn_id;

    IF NOT FOUND THEN RETURN; END IF;

    -- ── Rule 1: Amount > 3× 30-day average ──────────────────
    SELECT COALESCE(AVG(t2.amount), 0)
    INTO   v_avg_amt
    FROM   Transactions t2
    JOIN   Accounts     a2 ON a2.account_id = t2.from_acc_id
    WHERE  a2.user_id = v_user_id
    AND    t2.txn_id  <> p_txn_id
    AND    t2.txn_at  >= NOW() - INTERVAL '30 days'
    AND    t2.status  = 'SUCCESS';

    IF v_avg_amt > 0 AND v_amount > 3 * v_avg_amt THEN
        v_reason   := 'Amount ₹' || v_amount
                      || ' is 3x avg ₹' || ROUND(v_avg_amt);
        v_severity := 'HIGH';
    END IF;

    -- ── Rule 2: Burst — 5+ transactions in 10 minutes ───────
    SELECT COUNT(*)
    INTO   v_burst_ct
    FROM   Transactions t3
    JOIN   Accounts     a3 ON a3.account_id = t3.from_acc_id
    WHERE  a3.user_id = v_user_id
    AND    t3.txn_at  >= NOW() - INTERVAL '10 minutes';

    IF v_burst_ct >= 5 THEN
        v_reason   := CASE WHEN v_reason <> ''
                           THEN v_reason || ' | '
                           ELSE '' END
                      || 'Burst: ' || v_burst_ct || ' txns in 10 min';
        v_severity := 'HIGH';
    END IF;

    -- Insert alert WITHOUT user_id (3NF: user derived via FK chain)
    IF v_reason <> '' THEN
        INSERT INTO FraudAlerts(txn_id, reason, severity)
        VALUES (p_txn_id, v_reason, v_severity);

        UPDATE Transactions
        SET    status = 'FLAGGED'
        WHERE  txn_id = p_txn_id;
    END IF;
END;
$$;


-- ── 3. get_risk_score ────────────────────────────────────────
-- Returns the weighted fraud risk score for a user (0–100).
-- Derives the user's alerts via:
--   FraudAlerts → Transactions → Accounts (user_id)
-- Never reads a stored risk_score from Users (3NF compliant).
CREATE OR REPLACE FUNCTION get_risk_score(p_user_id INT)
RETURNS NUMERIC
LANGUAGE plpgsql AS $$
DECLARE
    v_score NUMERIC;
BEGIN
    SELECT COALESCE(SUM(
        CASE fa.severity
            WHEN 'HIGH'   THEN 30
            WHEN 'MEDIUM' THEN 15
            ELSE 5
        END
    ), 0)
    INTO  v_score
    FROM  FraudAlerts  fa
    JOIN  Transactions t  ON t.txn_id     = fa.txn_id
    JOIN  Accounts     a  ON a.account_id = t.from_acc_id
    WHERE a.user_id = p_user_id;

    RETURN LEAST(v_score, 100);
END;
$$;


-- ── 4. dashboard_summary ─────────────────────────────────────
-- Returns key dashboard metrics for a single user as a
-- result-set of (metric TEXT, value NUMERIC) rows.
CREATE OR REPLACE FUNCTION dashboard_summary(p_user_id INT)
RETURNS TABLE(metric TEXT, value NUMERIC)
LANGUAGE plpgsql AS $$
BEGIN
    -- Total balance across all accounts
    RETURN QUERY
    SELECT 'total_balance'::TEXT,
           COALESCE(SUM(balance), 0)
    FROM   Accounts
    WHERE  user_id = p_user_id;

    -- Money received this calendar month
    RETURN QUERY
    SELECT 'monthly_income'::TEXT,
           COALESCE(SUM(t.amount), 0)
    FROM   Transactions t
    JOIN   Accounts     a ON a.account_id = t.to_acc_id
    WHERE  a.user_id = p_user_id
    AND    t.status  = 'SUCCESS'
    AND    DATE_TRUNC('month', t.txn_at) = DATE_TRUNC('month', NOW());

    -- Expenses logged this calendar month
    RETURN QUERY
    SELECT 'monthly_expense'::TEXT,
           COALESCE(SUM(amount), 0)
    FROM   Expenses
    WHERE  user_id    = p_user_id
    AND    is_deleted = 'N'
    AND    DATE_TRUNC('month', exp_date) = DATE_TRUNC('month', NOW());

    -- Live risk score (never stored — always computed)
    RETURN QUERY
    SELECT 'risk_score'::TEXT,
           get_risk_score(p_user_id);
END;
$$;


-- ── 5. admin_platform_stats ──────────────────────────────────
-- Aggregated platform-wide metrics for the Admin Panel.
CREATE OR REPLACE FUNCTION admin_platform_stats()
RETURNS TABLE(metric TEXT, value NUMERIC)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY SELECT 'total_users'::TEXT,
                        COUNT(*)::NUMERIC FROM Users;

    RETURN QUERY SELECT 'active_users'::TEXT,
                        COUNT(*)::NUMERIC FROM Users WHERE is_active = 'Y';

    RETURN QUERY SELECT 'locked_users'::TEXT,
                        COUNT(*)::NUMERIC FROM Users WHERE is_active = 'N';

    RETURN QUERY SELECT 'total_accounts'::TEXT,
                        COUNT(*)::NUMERIC FROM Accounts;

    RETURN QUERY SELECT 'total_transactions'::TEXT,
                        COUNT(*)::NUMERIC FROM Transactions;

    RETURN QUERY SELECT 'flagged_transactions'::TEXT,
                        COUNT(*)::NUMERIC
                 FROM   Transactions WHERE status = 'FLAGGED';

    RETURN QUERY SELECT 'open_fraud_alerts'::TEXT,
                        COUNT(*)::NUMERIC
                 FROM   FraudAlerts WHERE is_resolved = 'N';

    RETURN QUERY SELECT 'total_funds'::TEXT,
                        COALESCE(SUM(balance), 0)
                 FROM   Accounts;
END;
$$;
