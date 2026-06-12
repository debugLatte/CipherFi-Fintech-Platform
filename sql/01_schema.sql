-- ============================================================
-- 01_schema.sql  |  Secure Personal Finance Platform
-- PostgreSQL 15+ / Neon
--
-- Third Normal Form (3NF) rules applied:
--   1. Every non-key attribute depends on the whole key only.
--   2. Every non-key attribute depends directly on the key,
--      not transitively through another non-key attribute.
--
-- Specific 3NF fixes:
--   • risk_score removed from Users — it is fully derivable
--     from FraudAlerts via get_risk_score().  Storing it
--     would create a transitive dependency:
--     user_id → FraudAlerts.severity → risk_score.
--   • user_id removed from FraudAlerts — the user is already
--     reachable via txn_id → Transactions.from_acc_id →
--     Accounts.user_id.  Storing user_id directly would
--     duplicate a fact already implied by the FK chain.
--   • currency kept on Accounts (not on Users) because
--     different accounts of the same user can use different
--     currencies — it is a fact about the account, not the user.
--   • cat_name kept only in Categories; Expenses stores cat_id.
--   • budget_month stored as DATE (first day of month) so the
--     UNIQUE constraint (user_id, cat_id, budget_month) prevents
--     duplicate budgets for the same user/category/month.
-- ============================================================

-- ── Drop existing objects (safe re-run) ──────────────────────
DROP TABLE IF EXISTS LoginHistory   CASCADE;
DROP TABLE IF EXISTS AuditLogs      CASCADE;
DROP TABLE IF EXISTS FraudAlerts    CASCADE;
DROP TABLE IF EXISTS Budgets        CASCADE;
DROP TABLE IF EXISTS Expenses       CASCADE;
DROP TABLE IF EXISTS Transactions   CASCADE;
DROP TABLE IF EXISTS Accounts       CASCADE;
DROP TABLE IF EXISTS Categories     CASCADE;
DROP TABLE IF EXISTS Users          CASCADE;

-- ── Users ────────────────────────────────────────────────────
-- Stores only facts that are directly and solely about a user.
-- risk_score is NOT stored here (derived via FraudAlerts chain).
CREATE TABLE Users (
    user_id    SERIAL       PRIMARY KEY,
    full_name  VARCHAR(100) NOT NULL,
    email      VARCHAR(150) NOT NULL UNIQUE,
    pass_hash  VARCHAR(255) NOT NULL,
    phone      VARCHAR(15),
    role       VARCHAR(10)  NOT NULL DEFAULT 'USER'
                            CHECK (role IN ('USER','ADMIN')),
    is_active  CHAR(1)      NOT NULL DEFAULT 'Y'
                            CHECK (is_active IN ('Y','N')),
    created_at TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── Categories ───────────────────────────────────────────────
-- Independent lookup table.  cat_name is the only non-key
-- attribute; it depends solely on cat_id.  3NF satisfied.
CREATE TABLE Categories (
    cat_id   SERIAL      PRIMARY KEY,
    cat_name VARCHAR(50) NOT NULL UNIQUE
);

-- ── Accounts ─────────────────────────────────────────────────
-- Every attribute (acc_number, acc_type, balance, currency,
-- is_frozen) is a fact about the account, not about the user.
-- 3NF satisfied: no transitive dependencies.
CREATE TABLE Accounts (
    account_id SERIAL        PRIMARY KEY,
    user_id    INT           NOT NULL REFERENCES Users(user_id)
                             ON DELETE CASCADE,
    acc_number VARCHAR(20)   NOT NULL UNIQUE,
    acc_type   VARCHAR(10)   NOT NULL
                             CHECK (acc_type IN ('SAVINGS','CURRENT')),
    balance    NUMERIC(15,2) NOT NULL DEFAULT 0
                             CHECK (balance >= 0),
    currency   VARCHAR(3)    NOT NULL DEFAULT 'INR',
    is_frozen  CHAR(1)       NOT NULL DEFAULT 'N'
                             CHECK (is_frozen IN ('Y','N')),
    created_at TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ── Transactions ─────────────────────────────────────────────
-- Records a single money movement.
-- from_acc_id / to_acc_id are FKs to Accounts — the owning
-- user is reachable via those FKs (no need to store user_id
-- again, which would violate 3NF).
CREATE TABLE Transactions (
    txn_id      SERIAL        PRIMARY KEY,
    from_acc_id INT           REFERENCES Accounts(account_id)
                              ON DELETE SET NULL,
    to_acc_id   INT           REFERENCES Accounts(account_id)
                              ON DELETE SET NULL,
    amount      NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    txn_type    VARCHAR(20)   NOT NULL
                              CHECK (txn_type IN
                                ('TRANSFER','DEPOSIT','WITHDRAWAL')),
    status      VARCHAR(10)   NOT NULL DEFAULT 'PENDING'
                              CHECK (status IN
                                ('PENDING','SUCCESS','FAILED','FLAGGED')),
    description VARCHAR(255),
    txn_at      TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ── Expenses ─────────────────────────────────────────────────
-- Records a manual expense logged by a user.
-- amount, note, exp_date are facts about the expense record.
-- is_deleted supports soft-delete (financial records must not
-- be physically removed).
CREATE TABLE Expenses (
    exp_id     SERIAL        PRIMARY KEY,
    user_id    INT           NOT NULL REFERENCES Users(user_id)
                             ON DELETE CASCADE,
    cat_id     INT           NOT NULL REFERENCES Categories(cat_id),
    amount     NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    note       VARCHAR(200),
    exp_date   DATE          NOT NULL DEFAULT CURRENT_DATE,
    is_deleted CHAR(1)       NOT NULL DEFAULT 'N'
                             CHECK (is_deleted IN ('Y','N'))
);

-- ── Budgets ──────────────────────────────────────────────────
-- One row per (user, category, month).
-- monthly_limit depends only on (user_id, cat_id, budget_month).
-- The composite UNIQUE constraint enforces this.
-- budget_month is stored as the first day of the month so that
-- DATE_TRUNC comparisons work cleanly.
CREATE TABLE Budgets (
    budget_id     SERIAL        PRIMARY KEY,
    user_id       INT           NOT NULL REFERENCES Users(user_id)
                                ON DELETE CASCADE,
    cat_id        INT           NOT NULL REFERENCES Categories(cat_id),
    monthly_limit NUMERIC(15,2) NOT NULL CHECK (monthly_limit > 0),
    budget_month  DATE          NOT NULL,
    CONSTRAINT uq_budget_user_cat_month
        UNIQUE (user_id, cat_id, budget_month)
);

-- ── FraudAlerts ──────────────────────────────────────────────
-- Stores ONE alert per suspicious transaction.
-- user_id is NOT stored here.  It is derivable via:
--   txn_id → Transactions.from_acc_id → Accounts.user_id
-- Storing user_id would create a transitive dependency:
--   alert_id → txn_id → from_acc_id → user_id
-- which violates 3NF (non-key attribute depends on non-key).
CREATE TABLE FraudAlerts (
    alert_id    SERIAL       PRIMARY KEY,
    txn_id      INT          NOT NULL REFERENCES Transactions(txn_id)
                             ON DELETE CASCADE,
    reason      VARCHAR(255) NOT NULL,
    severity    VARCHAR(10)  NOT NULL
                             CHECK (severity IN ('LOW','MEDIUM','HIGH')),
    is_resolved CHAR(1)      NOT NULL DEFAULT 'N'
                             CHECK (is_resolved IN ('Y','N')),
    flagged_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ── AuditLogs ────────────────────────────────────────────────
-- Immutable audit trail for financial table mutations.
-- changed_by is nullable because system triggers may fire
-- without a logged-in user context.
CREATE TABLE AuditLogs (
    log_id     SERIAL      PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    operation  VARCHAR(10) NOT NULL
                           CHECK (operation IN ('INSERT','UPDATE','DELETE')),
    row_id     INT         NOT NULL,
    changed_by INT         REFERENCES Users(user_id) ON DELETE SET NULL,
    old_val    TEXT,
    new_val    TEXT,
    changed_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ── LoginHistory ─────────────────────────────────────────────
-- One row per login attempt (success or failure).
-- ip_address and success are facts about the attempt, not the user.
CREATE TABLE LoginHistory (
    login_id   SERIAL      PRIMARY KEY,
    user_id    INT         NOT NULL REFERENCES Users(user_id)
                           ON DELETE CASCADE,
    login_time TIMESTAMP   NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(45),
    success    CHAR(1)     NOT NULL CHECK (success IN ('Y','N'))
);

-- ── Indexes ──────────────────────────────────────────────────
-- Performance indexes on high-selectivity FK and filter columns.
CREATE INDEX idx_accounts_user      ON Accounts(user_id);
CREATE INDEX idx_txn_from_acc       ON Transactions(from_acc_id);
CREATE INDEX idx_txn_to_acc         ON Transactions(to_acc_id);
CREATE INDEX idx_txn_at             ON Transactions(txn_at DESC);
CREATE INDEX idx_txn_status         ON Transactions(status);
CREATE INDEX idx_expenses_user_date ON Expenses(user_id, exp_date DESC);
CREATE INDEX idx_expenses_cat       ON Expenses(cat_id);
CREATE INDEX idx_budgets_user       ON Budgets(user_id);
CREATE INDEX idx_fraud_txn          ON FraudAlerts(txn_id);
CREATE INDEX idx_fraud_resolved     ON FraudAlerts(is_resolved);
CREATE INDEX idx_audit_table        ON AuditLogs(table_name, changed_at DESC);
CREATE INDEX idx_login_user_time    ON LoginHistory(user_id, login_time DESC);
