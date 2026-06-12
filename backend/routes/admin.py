from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from config import query, get_db
import psycopg2.extras

admin_bp = Blueprint("admin", __name__)


def require_admin():
    claims = get_jwt()
    if claims.get("role") != "ADMIN":
        return False
    return True


@admin_bp.route("/stats", methods=["GET"])
@jwt_required()
def stats():
    if not require_admin():
        return jsonify({"error": "Admin only"}), 403
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM admin_platform_stats()")
            rows = cur.fetchall()
        return jsonify({r["metric"]: float(r["value"]) for r in rows})
    finally:
        conn.close()


@admin_bp.route("/users", methods=["GET"])
@jwt_required()
def users():
    if not require_admin():
        return jsonify({"error": "Admin only"}), 403
    rows = query("SELECT * FROM AdminUserSummary ORDER BY user_id")
    return jsonify([dict(r) for r in rows])


@admin_bp.route("/users/<int:uid>/toggle-active", methods=["PATCH"])
@jwt_required()
def toggle_user(uid):
    if not require_admin():
        return jsonify({"error": "Admin only"}), 403
    user = query("SELECT is_active FROM Users WHERE user_id=%s", (uid,), fetch="one")
    if not user:
        return jsonify({"error": "User not found"}), 404
    new_status = "N" if user["is_active"] == "Y" else "Y"
    query("UPDATE Users SET is_active=%s WHERE user_id=%s", (new_status, uid), fetch=None)
    return jsonify({"message": f"User {'locked' if new_status=='N' else 'unlocked'}", "is_active": new_status})


@admin_bp.route("/fraud-alerts", methods=["GET"])
@jwt_required()
def all_alerts():
    if not require_admin():
        return jsonify({"error": "Admin only"}), 403
    rows = query(
        """
        SELECT fa.alert_id, fa.txn_id, fa.reason, fa.severity, fa.is_resolved, fa.flagged_at,
               t.amount, u.full_name, u.email, af.acc_number
        FROM   FraudAlerts fa
        JOIN   Transactions t  ON t.txn_id      = fa.txn_id
        JOIN   Accounts     af ON af.account_id  = t.from_acc_id
        JOIN   Users        u  ON u.user_id      = af.user_id
        ORDER  BY fa.flagged_at DESC
        """
    )
    return jsonify([dict(r) for r in rows])


@admin_bp.route("/fraud-alerts/<int:alert_id>/resolve", methods=["PATCH"])
@jwt_required()
def resolve(alert_id):
    if not require_admin():
        return jsonify({"error": "Admin only"}), 403
    query("UPDATE FraudAlerts SET is_resolved='Y' WHERE alert_id=%s", (alert_id,), fetch=None)
    return jsonify({"message": "Resolved"})


@admin_bp.route("/audit-logs", methods=["GET"])
@jwt_required()
def audit_logs():
    if not require_admin():
        return jsonify({"error": "Admin only"}), 403
    limit = request.args.get("limit", 50, type=int)
    rows = query(
        "SELECT * FROM AuditLogs ORDER BY changed_at DESC LIMIT %s", (limit,)
    )
    return jsonify([dict(r) for r in rows])


@admin_bp.route("/transactions", methods=["GET"])
@jwt_required()
def all_transactions():
    if not require_admin():
        return jsonify({"error": "Admin only"}), 403
    limit = request.args.get("limit", 50, type=int)
    rows = query(
        """
        SELECT t.txn_id, t.amount, t.txn_type, t.status, t.description, t.txn_at,
               u.full_name, af.acc_number AS from_acc, at2.acc_number AS to_acc
        FROM   Transactions t
        LEFT JOIN Accounts af  ON af.account_id  = t.from_acc_id
        LEFT JOIN Accounts at2 ON at2.account_id = t.to_acc_id
        LEFT JOIN Users    u   ON u.user_id       = af.user_id
        ORDER  BY t.txn_at DESC LIMIT %s
        """,
        (limit,)
    )
    return jsonify([dict(r) for r in rows])
