from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from config import query

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/monthly", methods=["GET"])
@jwt_required()
def monthly():
    uid = int(get_jwt_identity())
    rows = query(
        "SELECT month, cat_name, total_spent, txn_count, avg_spend FROM MonthlySummary WHERE user_id=%s ORDER BY month DESC LIMIT 84",
        (uid,)
    )
    return jsonify([dict(r) for r in rows])


@analytics_bp.route("/budget-status", methods=["GET"])
@jwt_required()
def budget_status():
    uid = int(get_jwt_identity())
    rows = query(
        "SELECT cat_name, monthly_limit, amount_spent, remaining, budget_status FROM BudgetStatus WHERE user_id=%s",
        (uid,)
    )
    return jsonify([dict(r) for r in rows])


@analytics_bp.route("/expenses", methods=["GET"])
@jwt_required()
def expenses():
    uid = int(get_jwt_identity())
    rows = query(
        """
        SELECT e.exp_id, c.cat_name, c.cat_id, e.amount, e.note, e.exp_date
        FROM   Expenses e
        JOIN   Categories c ON c.cat_id = e.cat_id
        WHERE  e.user_id = %s AND e.is_deleted = 'N'
        ORDER  BY e.exp_date DESC
        LIMIT  200
        """,
        (uid,)
    )
    return jsonify([dict(r) for r in rows])


@analytics_bp.route("/expenses", methods=["POST"])
@jwt_required()
def add_expense():
    uid = int(get_jwt_identity())
    data = request.get_json() or {}
    cat_id   = data.get("cat_id")
    amount   = data.get("amount")
    note     = data.get("note", "")
    exp_date = data.get("exp_date")

    if not all([cat_id, amount]):
        return jsonify({"error": "cat_id and amount required"}), 400

    try:
        row = query(
            "INSERT INTO Expenses(user_id,cat_id,amount,note,exp_date) VALUES(%s,%s,%s,%s,COALESCE(%s::date,CURRENT_DATE)) RETURNING *",
            (uid, cat_id, amount, note, exp_date), fetch="one"
        )
        return jsonify(dict(row)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@analytics_bp.route("/expenses/<int:exp_id>", methods=["DELETE"])
@jwt_required()
def delete_expense(exp_id):
    uid = int(get_jwt_identity())
    query(
        "UPDATE Expenses SET is_deleted='Y' WHERE exp_id=%s AND user_id=%s",
        (exp_id, uid), fetch=None
    )
    return jsonify({"message": "Expense removed"})


@analytics_bp.route("/categories", methods=["GET"])
@jwt_required()
def categories():
    rows = query("SELECT cat_id, cat_name FROM Categories ORDER BY cat_name")
    return jsonify([dict(r) for r in rows])


@analytics_bp.route("/budgets", methods=["GET"])
@jwt_required()
def budgets():
    uid = int(get_jwt_identity())
    rows = query(
        """
        SELECT b.budget_id, c.cat_name, b.monthly_limit, b.budget_month
        FROM   Budgets b JOIN Categories c ON c.cat_id = b.cat_id
        WHERE  b.user_id = %s
        ORDER  BY b.budget_month DESC
        """,
        (uid,)
    )
    return jsonify([dict(r) for r in rows])


@analytics_bp.route("/budgets", methods=["POST"])
@jwt_required()
def set_budget():
    uid = int(get_jwt_identity())
    data = request.get_json() or {}
    cat_id  = data.get("cat_id")
    limit_  = data.get("monthly_limit")
    month   = data.get("budget_month")  # e.g. "2025-04-01"

    if not all([cat_id, limit_]):
        return jsonify({"error": "cat_id and monthly_limit required"}), 400

    try:
        row = query(
            """
            INSERT INTO Budgets(user_id,cat_id,monthly_limit,budget_month)
            VALUES(%s,%s,%s,COALESCE(%s::date, DATE_TRUNC('month',CURRENT_DATE)))
            ON CONFLICT(user_id,cat_id,budget_month) DO UPDATE SET monthly_limit=EXCLUDED.monthly_limit
            RETURNING *
            """,
            (uid, cat_id, limit_, month), fetch="one"
        )
        return jsonify(dict(row)), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400
