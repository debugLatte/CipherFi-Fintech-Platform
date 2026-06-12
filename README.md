# FinTrack — Secure Personal Finance Platform
> SQL-Driven Analytics · Fraud Detection · Budget Enforcement · Admin Panel

**Stack:** React + Vite + Tailwind CSS · Flask (Python) · Neon (PostgreSQL 15)

---

## ⚡ Quick Start (3 steps)

### Step 1 — Set up Neon Database

1. Go to **https://neon.tech** → sign up free
2. Create a new project (name it `fintrack`)
3. Open **SQL Editor** in your Neon dashboard
4. Run the 5 files in the `sql/` folder **in this exact order**:

```
sql/01_schema.sql     ← creates all tables + indexes
sql/02_views.sql      ← creates all views
sql/03_functions.sql  ← stored functions (transfer, fraud, etc.)
sql/04_triggers.sql   ← triggers (audit, budget, lockout, etc.)
sql/05_seed_data.sql  ← demo users, accounts, transactions
```

5. Copy your **Connection String** from:
   `Neon Dashboard → Your Project → Connection Details → Connection string`

   It looks like:
   ```
   postgresql://user:pass@ep-cool-name.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

---

### Step 2 — Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate
# Mac / Linux
source venv/bin/activate

# Install packages
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
```

Open `.env` and paste your values:
```env
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET_KEY=pick-any-long-random-string
```

```bash
# Start the API server
python app.py
# → http://localhost:5000
```

---

### Step 3 — Frontend

```bash
cd frontend

npm install
npm run dev
# → http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## 🔑 Demo Credentials

| Email | Password | Role |
|-------|----------|------|
| admin@fintrack.com | password123 | **ADMIN** |
| arjun@demo.com | password123 | USER |
| priya@demo.com | password123 | USER |
| rahul@demo.com | password123 | USER |

---

## 📂 Project Structure

```
fintrack/
│
├── sql/                        ← Run these in Neon SQL Editor
│   ├── 01_schema.sql           Tables + indexes (3NF normalised)
│   ├── 02_views.sql            6 analytical views
│   ├── 03_functions.sql        5 stored functions
│   ├── 04_triggers.sql         5 triggers
│   └── 05_seed_data.sql        Demo data
│
├── backend/                    ← Flask REST API
│   ├── app.py                  App factory + blueprint registration
│   ├── config.py               DB connection (Neon via psycopg2)
│   ├── requirements.txt
│   ├── .env.example
│   └── routes/
│       ├── auth.py             /api/auth/*
│       ├── accounts.py         /api/accounts/*
│       ├── transactions.py     /api/transactions/*
│       ├── analytics.py        /api/analytics/*
│       ├── fraud.py            /api/fraud/*
│       └── admin.py            /api/admin/*  (ADMIN only)
│
└── frontend/                   ← React + Vite
    ├── index.html
    ├── package.json
    ├── vite.config.js          Proxy /api → localhost:5000
    └── src/
        ├── App.jsx             Router + protected routes
        ├── index.css           Global dark theme
        ├── api/axios.js        Axios + JWT interceptor
        ├── hooks/useAuth.jsx   Auth context
        ├── components/
        │   ├── Layout.jsx
        │   ├── Sidebar.jsx
        │   ├── StatCard.jsx
        │   └── ProtectedRoute.jsx
        └── pages/
            ├── Login.jsx
            ├── Register.jsx
            ├── Dashboard.jsx   Stats + charts + recent txns
            ├── Accounts.jsx    Account cards + create account
            ├── Transfer.jsx    Transfer money between accounts
            ├── Expenses.jsx    Log + view expenses with budgets
            ├── Budgets.jsx     Set + track monthly budgets
            ├── Analytics.jsx   Bar/line/pie charts from SQL views
            ├── Fraud.jsx       Risk score + alert management
            ├── Profile.jsx     User info + login history
            └── Admin.jsx       Full admin console (4 tabs)
```

---

## 🗄️ Database Design (3NF)

### Why 3NF?
Third Normal Form eliminates **transitive dependencies** — every non-key attribute must depend *directly* on the primary key, not through another non-key attribute.

### Key 3NF decisions

| Decision | Reason |
|----------|--------|
| `risk_score` removed from `Users` | Transitively derived: `user_id → FraudAlerts.severity → score`. Storing it duplicates data and causes update anomalies. Use `get_risk_score()` instead. |
| `user_id` removed from `FraudAlerts` | Already reachable via `txn_id → Transactions.from_acc_id → Accounts.user_id`. Storing it again would be a transitive dependency. |
| `cat_name` only in `Categories` | `Expenses` stores `cat_id` FK only. Repeating `cat_name` in `Expenses` would violate 2NF/3NF. |
| `currency` on `Accounts`, not `Users` | One user can have accounts in multiple currencies — it is a fact about the account, not the user. |
| `budget_month` stored as `DATE` | First day of month. The `UNIQUE(user_id, cat_id, budget_month)` constraint prevents duplicate budgets. |

### Tables

| Table | Primary Key | Description |
|-------|-------------|-------------|
| `Users` | `user_id` | Platform users (no computed columns) |
| `Categories` | `cat_id` | Expense categories lookup |
| `Accounts` | `account_id` | Bank accounts belonging to users |
| `Transactions` | `txn_id` | Money movements between accounts |
| `Expenses` | `exp_id` | User-logged expenses by category |
| `Budgets` | `budget_id` | Monthly limits per user per category |
| `FraudAlerts` | `alert_id` | Fraud flags linked to transactions |
| `AuditLogs` | `log_id` | Immutable audit trail |
| `LoginHistory` | `login_id` | Login attempts (success + failure) |

---

## 🔒 Security Features

- **JWT** — 8-hour access tokens, verified on every protected route
- **bcrypt** — passwords hashed with salt rounds
- **Login lockout** — DB trigger locks account after 5 failures in 15 min
- **Budget enforcement** — DB trigger blocks overspend at insert time
- **Soft deletes** — DB trigger blocks hard DELETE on `Expenses`
- **Audit trail** — every Transactions change logged immutably
- **Row-level locking** — `SELECT … FOR UPDATE` in `transfer_money()` prevents race conditions
- **Fraud detection** — automatic post-transfer analysis via `check_fraud()`
