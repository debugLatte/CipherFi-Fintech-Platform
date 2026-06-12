-- ============================================================
-- 05_seed_data.sql  |  Secure Personal Finance Platform
-- Run LAST (after all schema, views, functions, triggers)
--
-- Seed data summary:
--   8 Categories
--   4 Users  (1 ADMIN + 3 USER)
--   5 Accounts
--   8 Transactions
--   7 Expenses
--   6 Budgets (current month)
--   3 FraudAlerts   ← NO user_id column (3NF)
--   6 LoginHistory entries
--
-- All passwords = "password123"
-- bcrypt hash (verified working):
--   $2b$12$UWT6MPmo5PZobz6dIBb5RuNOXRxpr3k4MZRAuEZi2XQP9v3olfade
-- ============================================================

-- ── Categories ───────────────────────────────────────────────
INSERT INTO Categories(cat_name) VALUES
    ('Food'),
    ('Transport'),
    ('Entertainment'),
    ('Shopping'),
    ('Healthcare'),
    ('Utilities'),
    ('Education'),
    ('Travel');


-- ── Users ────────────────────────────────────────────────────
-- risk_score column does NOT exist (removed for 3NF).
-- Role ADMIN for first user; USER for the rest.
INSERT INTO Users(full_name, email, pass_hash, phone, role) VALUES
    ('Admin User',   'admin@fintrack.com',
     '$2b$12$UWT6MPmo5PZobz6dIBb5RuNOXRxpr3k4MZRAuEZi2XQP9v3olfade',
     '9000000000', 'ADMIN'),
    ('Arjun Sharma', 'arjun@demo.com',
     '$2b$12$UWT6MPmo5PZobz6dIBb5RuNOXRxpr3k4MZRAuEZi2XQP9v3olfade',
     '9876543210', 'USER'),
    ('Priya Nair',   'priya@demo.com',
     '$2b$12$UWT6MPmo5PZobz6dIBb5RuNOXRxpr3k4MZRAuEZi2XQP9v3olfade',
     '9876543211', 'USER'),
    ('Rahul Verma',  'rahul@demo.com',
     '$2b$12$UWT6MPmo5PZobz6dIBb5RuNOXRxpr3k4MZRAuEZi2XQP9v3olfade',
     '9876543212', 'USER');
-- user_id auto-assigned: Admin=1, Arjun=2, Priya=3, Rahul=4


-- ── Accounts ─────────────────────────────────────────────────
-- Each account belongs to one user (user_id FK).
-- Opening balances reflect a realistic snapshot.
INSERT INTO Accounts(user_id, acc_number, acc_type, balance, currency) VALUES
    (2, 'ACC1001', 'SAVINGS',  85000.00, 'INR'),   -- account_id = 1
    (2, 'ACC1002', 'CURRENT',  32000.00, 'INR'),   -- account_id = 2
    (3, 'ACC2001', 'SAVINGS', 120000.00, 'INR'),   -- account_id = 3
    (4, 'ACC3001', 'SAVINGS',  45000.00, 'INR'),   -- account_id = 4
    (1, 'ACC0001', 'CURRENT',   5000.00, 'INR');   -- account_id = 5 (admin)


-- ── Transactions ─────────────────────────────────────────────
-- Note: the fraud-check trigger fires automatically after
-- each INSERT here (trg_post_transfer_fraud → check_fraud()).
-- A few of these will generate FraudAlerts automatically.
-- We also insert manual alerts below for demo purposes.
INSERT INTO Transactions(from_acc_id, to_acc_id, amount,
                          txn_type, status, description) VALUES
    (1, 3,  5000.00, 'TRANSFER', 'SUCCESS', 'Monthly rent share'),
    (2, 3,  1500.00, 'TRANSFER', 'SUCCESS', 'Dinner split'),
    (3, 1,  2000.00, 'TRANSFER', 'SUCCESS', 'Books reimbursement'),
    (1, 2, 10000.00, 'TRANSFER', 'SUCCESS', 'Own account top-up'),
    (2, 3,   500.00, 'TRANSFER', 'SUCCESS', 'Coffee'),
    (4, 1,  3000.00, 'TRANSFER', 'SUCCESS', 'Loan repayment'),
    (3, 4,   750.00, 'TRANSFER', 'SUCCESS', 'Movie tickets'),
    (1, 4,  8000.00, 'TRANSFER', 'SUCCESS', 'Freelance payment');
-- txn_id auto-assigned: 1 – 8


-- ── Expenses ─────────────────────────────────────────────────
-- The budget-enforcement trigger (trg_enforce_budget) fires
-- for each row.  Amounts are kept within the budgets below.
INSERT INTO Expenses(user_id, cat_id, amount, note, exp_date) VALUES
    (2, 1, 1200.00, 'Weekly groceries',   CURRENT_DATE - 2),
    (2, 2,  450.00, 'Uber to office',     CURRENT_DATE - 1),
    (2, 3,  800.00, 'Netflix + Prime',    CURRENT_DATE),
    (2, 4, 3500.00, 'New running shoes',  CURRENT_DATE - 5),
    (3, 1,  950.00, 'Restaurant dinner',  CURRENT_DATE - 3),
    (3, 5,  600.00, 'Pharmacy',           CURRENT_DATE - 1),
    (4, 7, 2000.00, 'Udemy course',       CURRENT_DATE);


-- ── Budgets ──────────────────────────────────────────────────
-- Current-month budgets.  budget_month is stored as the first
-- day of the month (DATE_TRUNC result) to satisfy the UNIQUE
-- constraint and allow clean comparisons in BudgetStatus view.
INSERT INTO Budgets(user_id, cat_id, monthly_limit, budget_month) VALUES
    (2, 1, 5000.00, DATE_TRUNC('month', CURRENT_DATE)),   -- Food
    (2, 2, 2000.00, DATE_TRUNC('month', CURRENT_DATE)),   -- Transport
    (2, 3, 1500.00, DATE_TRUNC('month', CURRENT_DATE)),   -- Entertainment
    (2, 4, 4000.00, DATE_TRUNC('month', CURRENT_DATE)),   -- Shopping
    (3, 1, 3000.00, DATE_TRUNC('month', CURRENT_DATE)),   -- Food
    (3, 5, 2000.00, DATE_TRUNC('month', CURRENT_DATE));   -- Healthcare


-- ── FraudAlerts ──────────────────────────────────────────────
-- Manual seed alerts for demo / testing purposes.
-- user_id column does NOT exist on FraudAlerts (3NF compliant).
-- The user is derived via: txn_id → from_acc_id → user_id.
-- txn 1 → from_acc_id 1 → user_id 2 (Arjun)
-- txn 2 → from_acc_id 2 → user_id 2 (Arjun)
-- txn 3 → from_acc_id 3 → user_id 3 (Priya)
INSERT INTO FraudAlerts(txn_id, reason, severity, is_resolved) VALUES
    (1, 'Amount ₹5000 is 3x avg ₹1500 for this user', 'HIGH',   'N'),
    (2, 'Burst: 5 transactions within 10 minutes',     'HIGH',   'N'),
    (3, 'Amount ₹2000 is 3x avg ₹600 for this user',  'MEDIUM', 'Y');


-- ── LoginHistory ─────────────────────────────────────────────
-- Mix of successful and failed logins for demo purposes.
-- Failed logins for Arjun (user_id=2) demonstrate lockout logic.
INSERT INTO LoginHistory(user_id, login_time, ip_address, success) VALUES
    (1, NOW() - INTERVAL '2 hours',  '192.168.1.1',  'Y'),
    (2, NOW() - INTERVAL '1 hour',   '192.168.1.10', 'Y'),
    (2, NOW() - INTERVAL '30 minutes','192.168.1.10', 'N'),
    (2, NOW() - INTERVAL '28 minutes','192.168.1.10', 'N'),
    (3, NOW() - INTERVAL '45 minutes','10.0.0.5',     'Y'),
    (4, NOW() - INTERVAL '15 minutes','10.0.0.8',     'Y');
