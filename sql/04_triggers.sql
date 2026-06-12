-- ============================================================
-- 04_triggers.sql  |  Secure Personal Finance Platform
-- Run AFTER 03_functions.sql
--
-- Triggers listed:
--   1. trg_audit_transactions  — immutable audit log on Transactions
--   2. trg_enforce_budget      — block expense if monthly limit hit
--   3. trg_post_transfer_fraud — auto fraud-check after transfer
--   4. trg_login_lockout       — lock account after 5 failed logins
--   5. trg_no_hard_delete      — block DELETE on Expenses (soft only)
--
-- Deliberately NOT present:
--   trg_update_risk_score — risk_score is not stored on Users
--   (3NF: it is derived on demand via get_risk_score()).
-- ============================================================

-- ── Trigger 1: Audit log on Transactions ─────────────────────
-- Fires AFTER every INSERT, UPDATE or DELETE on Transactions.
-- Records the old and new status+amount so investigators can
-- reconstruct the full history of any transaction.
CREATE OR REPLACE FUNCTION fn_audit_transactions()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO AuditLogs(table_name, operation, row_id, old_val, new_val)
    VALUES (
        'TRANSACTIONS',
        TG_OP,
        COALESCE(NEW.txn_id, OLD.txn_id),
        CASE WHEN TG_OP IN ('UPDATE','DELETE')
             THEN 'status=' || OLD.status || ',amount=' || OLD.amount
             ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT','UPDATE')
             THEN 'status=' || NEW.status || ',amount=' || NEW.amount
             ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_transactions ON Transactions;
CREATE TRIGGER trg_audit_transactions
AFTER INSERT OR UPDATE OR DELETE ON Transactions
FOR EACH ROW EXECUTE FUNCTION fn_audit_transactions();


-- ── Trigger 2: Budget enforcement before Expenses INSERT ─────
-- Fires BEFORE every INSERT on Expenses.
-- Looks up the monthly limit for (user, category, current month).
-- If no budget exists the insert is allowed freely.
-- If (spent so far + new amount) exceeds the limit, raises an
-- exception and rolls back the insert.
CREATE OR REPLACE FUNCTION fn_enforce_budget()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_limit NUMERIC;
    v_spent NUMERIC;
BEGIN
    -- Fetch the active monthly limit (if one is set)
    SELECT COALESCE(monthly_limit, NULL)
    INTO   v_limit
    FROM   Budgets
    WHERE  user_id  = NEW.user_id
    AND    cat_id   = NEW.cat_id
    AND    DATE_TRUNC('month', budget_month) =
           DATE_TRUNC('month', CURRENT_DATE)
    LIMIT 1;

    -- No budget set → allow the insert
    IF v_limit IS NULL THEN
        RETURN NEW;
    END IF;

    -- Sum current month's non-deleted expenses for this category
    SELECT COALESCE(SUM(amount), 0)
    INTO   v_spent
    FROM   Expenses
    WHERE  user_id    = NEW.user_id
    AND    cat_id     = NEW.cat_id
    AND    is_deleted = 'N'
    AND    DATE_TRUNC('month', exp_date) =
           DATE_TRUNC('month', CURRENT_DATE);

    IF (v_spent + NEW.amount) > v_limit THEN
        RAISE EXCEPTION
            'Budget exceeded for this category! '
            'Limit: ₹%, Already spent: ₹%, Attempted: ₹%',
            v_limit, v_spent, NEW.amount;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_budget ON Expenses;
CREATE TRIGGER trg_enforce_budget
BEFORE INSERT ON Expenses
FOR EACH ROW EXECUTE FUNCTION fn_enforce_budget();


-- ── Trigger 3: Auto fraud check after successful transfer ────
-- Fires AFTER every INSERT on Transactions.
-- Only invokes check_fraud() when the new row is a successful
-- TRANSFER, avoiding unnecessary calls for deposits/withdrawals.
CREATE OR REPLACE FUNCTION fn_post_transfer_fraud()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.txn_type = 'TRANSFER' AND NEW.status = 'SUCCESS' THEN
        PERFORM check_fraud(NEW.txn_id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_transfer_fraud ON Transactions;
CREATE TRIGGER trg_post_transfer_fraud
AFTER INSERT ON Transactions
FOR EACH ROW EXECUTE FUNCTION fn_post_transfer_fraud();


-- ── Trigger 4: Login lockout after 5 failed attempts ─────────
-- Fires AFTER every INSERT on LoginHistory.
-- Counts failures in the last 15 minutes for the same user.
-- If ≥ 5 failures, sets Users.is_active = 'N' (locked).
CREATE OR REPLACE FUNCTION fn_login_lockout()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_fail_count INT;
BEGIN
    IF NEW.success = 'N' THEN
        SELECT COUNT(*)
        INTO   v_fail_count
        FROM   LoginHistory
        WHERE  user_id    = NEW.user_id
        AND    success    = 'N'
        AND    login_time >= NOW() - INTERVAL '15 minutes';

        IF v_fail_count >= 5 THEN
            UPDATE Users
            SET    is_active = 'N'
            WHERE  user_id = NEW.user_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_login_lockout ON LoginHistory;
CREATE TRIGGER trg_login_lockout
AFTER INSERT ON LoginHistory
FOR EACH ROW EXECUTE FUNCTION fn_login_lockout();


-- ── Trigger 5: Block hard deletes on Expenses ────────────────
-- Financial records must never be physically removed.
-- This trigger raises an exception if anyone attempts a DELETE
-- on the Expenses table, instructing them to use soft-delete.
CREATE OR REPLACE FUNCTION fn_no_hard_delete()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION
        'Hard delete is not allowed on Expenses. '
        'Use: UPDATE Expenses SET is_deleted = ''Y'' '
        'WHERE exp_id = %', OLD.exp_id;
END;
$$;

DROP TRIGGER IF EXISTS trg_no_hard_delete_expenses ON Expenses;
CREATE TRIGGER trg_no_hard_delete_expenses
BEFORE DELETE ON Expenses
FOR EACH ROW EXECUTE FUNCTION fn_no_hard_delete();
