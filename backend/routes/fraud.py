from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from config import query, get_db
import psycopg2.extras

fraud_bp = Blueprint("fraud", __name__)


@fraud_bp.route("/alerts", methods=["GET"])
@jwt_required()
def get_alerts():
    uid = int(get_jwt_identity())
    rows = query(
        """
        SELECT fa.alert_id, fa.txn_id, fa.reason, fa.severity, fa.is_resolved, fa.flagged_at,
               t.amount, t.status AS txn_status, af.acc_number
        FROM   FraudAlerts fa
        JOIN   Transactions t  ON t.txn_id      = fa.txn_id
        JOIN   Accounts     af ON af.account_id  = t.from_acc_id
        WHERE  af.user_id = %s
        ORDER  BY fa.flagged_at DESC
        """,
        (uid,)
    )
    return jsonify([dict(r) for r in rows])


@fraud_bp.route("/alerts/<int:alert_id>/resolve", methods=["PATCH"])
@jwt_required()
def resolve_alert(alert_id):
    uid = int(get_jwt_identity())
    # verify ownership
    owner = query(
        """
        SELECT fa.alert_id FROM FraudAlerts fa
        JOIN Transactions t ON t.txn_id = fa.txn_id
        JOIN Accounts a ON a.account_id = t.from_acc_id
        WHERE fa.alert_id = %s AND a.user_id = %s
        """,
        (alert_id, uid), fetch="one"
    )
    if not owner:
        return jsonify({"error": "Not found or unauthorized"}), 404

    query(
        "UPDATE FraudAlerts SET is_resolved='Y' WHERE alert_id=%s",
        (alert_id,), fetch=None
    )
    return jsonify({"message": "Alert resolved"})


@fraud_bp.route("/risk-score", methods=["GET"])
@jwt_required()
def risk_score():
    uid = int(get_jwt_identity())
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT get_risk_score(%s) AS score", (uid,))
            row = cur.fetchone()
        return jsonify({"risk_score": float(row["score"]) if row else 0})
    finally:
        conn.close()
