-- ============================================================
-- 02_views.sql  |  Secure Personal Finance Platform
-- Run AFTER 01_schema.sql
--
-- All views derive user identity through FK chains, never from
-- a denormalised stored column, keeping the design 3NF compliant.
--
-- FraudAlerts has no user_id column.  Every view that needs
-- the user derives it via:
--   FraudAlerts.txn_id
--     → Transactions.from_acc_id
--     → Accounts.user_id
-- ============================================================

-- ── 1. MonthlySummary ────────────────────────────────────────
-- Spending per user, per category, per calendar month.
-- Useful for bar/line charts on the analytics dashboard.
CREATE OR REPLACE VIEW MonthlySummary AS
SELECT
    u.user_id,
    u.full_name,
    DATE_TRUNC('month', e.exp_date)          AS month,
    c.cat_name,
    SUM(e.amount)                            AS total_spent,
    COUNT(e.exp_id)                          AS txn_count,
    ROUND(AVG(e.amount)::NUMERIC, 2)         AS avg_spend
FROM   Expenses    e
JOIN   Users       u ON u.user_id = e.user_id
JOIN   Categories  c ON c.cat_id  = e.cat_id
WHERE  e.is_deleted = 'N'
GROUP  BY
    u.user_id,
    u.full_name,
    DATE_TRUNC('month', e.exp_date),
    c.cat_name;


-- ── 2. AccountOverview ───────────────────────────────────────
-- Aggregated account stats per active user.
-- Used on the Accounts page header strip.
CREATE OR REPLACE VIEW AccountOverview AS
SELECT
    u.user_id,
    u.full_name,
    u.email,
    COUNT(a.account_id)   AS total_accounts,
    SUM(a.balance)        AS total_balance,
    MAX(a.balance)        AS highest_balance,
    MIN(a.balance)        AS lowest_balance
FROM   Users    u
JOIN   Accounts a ON a.user_id = u.user_id
WHERE  u.is_active = 'Y'
GROUP  BY u.user_id, u.full_name, u.email;


-- ── 3. FraudRiskScore ────────────────────────────────────────
-- Weighted risk score per user computed from FraudAlerts.
-- 3NF note: user identity is derived via the FK chain
--   FraudAlerts → Transactions → Accounts → Users.
-- No user_id is stored on FraudAlerts.
CREATE OR REPLACE VIEW FraudRiskScore AS
SELECT
    u.user_id,
    u.full_name,
    COUNT(fa.alert_id)                                   AS total_flags,
    COALESCE(SUM(
        CASE fa.severity
            WHEN 'HIGH'   THEN 30
            WHEN 'MEDIUM' THEN 15
            WHEN 'LOW'    THEN  5
            ELSE 0
        END
    ), 0)                                                AS risk_score,
    COUNT(fa.alert_id) FILTER (WHERE fa.is_resolved='N') AS open_flags
FROM   Users u
LEFT JOIN Accounts     a  ON a.user_id    = u.user_id
LEFT JOIN Transactions t  ON t.from_acc_id = a.account_id
LEFT JOIN FraudAlerts  fa ON fa.txn_id    = t.txn_id
GROUP  BY u.user_id, u.full_name;


-- ── 4. BudgetStatus ──────────────────────────────────────────
-- Current-month budget vs. actual spend per user per category.
-- Status: OK | WARNING (≥80 %) | EXCEEDED (≥100 %).
CREATE OR REPLACE VIEW BudgetStatus AS
SELECT
    b.user_id,
    c.cat_name,
    b.monthly_limit,
    COALESCE(s.total, 0)                             AS amount_spent,
    b.monthly_limit - COALESCE(s.total, 0)           AS remaining,
    CASE
        WHEN COALESCE(s.total, 0) >= b.monthly_limit          THEN 'EXCEEDED'
        WHEN COALESCE(s.total, 0) >= 0.8 * b.monthly_limit   THEN 'WARNING'
        ELSE 'OK'
    END                                              AS budget_status
FROM   Budgets     b
JOIN   Categories  c ON c.cat_id = b.cat_id
LEFT JOIN (
    SELECT user_id, cat_id, SUM(amount) AS total
    FROM   Expenses
    WHERE  is_deleted = 'N'
    AND    DATE_TRUNC('month', exp_date) = DATE_TRUNC('month', CURRENT_DATE)
    GROUP  BY user_id, cat_id
) s ON s.user_id = b.user_id AND s.cat_id = b.cat_id
WHERE  DATE_TRUNC('month', b.budget_month) = DATE_TRUNC('month', CURRENT_DATE);


-- ── 5. AdminUserSummary ──────────────────────────────────────
-- Full user overview for the Admin Panel.
-- risk_score is derived live from FraudRiskScore view
-- (not stored on Users, keeping the schema in 3NF).
CREATE OR REPLACE VIEW AdminUserSummary AS
SELECT
    u.user_id,
    u.full_name,
    u.email,
    u.phone,
    u.role,
    u.is_active,
    u.created_at,
    COALESCE(acc.total_accounts, 0)  AS total_accounts,
    COALESCE(acc.total_balance,  0)  AS total_balance,
    COALESCE(fr.risk_score,      0)  AS risk_score,
    COALESCE(fr.open_flags,      0)  AS open_fraud_alerts,
    COALESCE(txn.txn_count,      0)  AS total_transactions
FROM   Users u
-- account aggregates
LEFT JOIN (
    SELECT user_id,
           COUNT(*)      AS total_accounts,
           SUM(balance)  AS total_balance
    FROM   Accounts
    GROUP  BY user_id
) acc ON acc.user_id = u.user_id
-- fraud risk (derived — 3NF compliant)
LEFT JOIN FraudRiskScore fr ON fr.user_id = u.user_id
-- transaction count (via account ownership)
LEFT JOIN (
    SELECT a.user_id, COUNT(*) AS txn_count
    FROM   Transactions t
    JOIN   Accounts     a ON a.account_id = t.from_acc_id
    GROUP  BY a.user_id
) txn ON txn.user_id = u.user_id;


-- ── 6. TransactionLedger ─────────────────────────────────────
-- Human-readable transaction list with account numbers and
-- owner name.  Used by the admin Transactions tab and
-- user transaction history.
CREATE OR REPLACE VIEW TransactionLedger AS
SELECT
    t.txn_id,
    t.amount,
    t.txn_type,
    t.status,
    t.description,
    t.txn_at,
    af.acc_number      AS from_acc,
    at2.acc_number     AS to_acc,
    uf.user_id         AS from_user_id,
    uf.full_name       AS from_user_name
FROM   Transactions t
LEFT JOIN Accounts af  ON af.account_id  = t.from_acc_id
LEFT JOIN Accounts at2 ON at2.account_id = t.to_acc_id
LEFT JOIN Users    uf  ON uf.user_id     = af.user_id;
