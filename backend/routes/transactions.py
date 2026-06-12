from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from config import query, get_db
import psycopg2.extras

transactions_bp = Blueprint("transactions", __name__)


@transactions_bp.route("", methods=["GET"])
@transactions_bp.route("/", methods=["GET"])
@jwt_required()
def get_transactions():
    uid = int(get_jwt_identity())
    limit = request.args.get("limit", 20, type=int)
    offset = request.args.get("offset", 0, type=int)
    rows = query(
        """
        SELECT t.txn_id, t.amount, t.txn_type, t.status, t.description, t.txn_at,
               af.acc_number AS from_acc, at2.acc_number AS to_acc
        FROM   Transactions t
        LEFT JOIN Accounts af  ON af.account_id  = t.from_acc_id
        LEFT JOIN Accounts at2 ON at2.account_id = t.to_acc_id
        WHERE  af.user_id = %s OR at2.user_id = %s
        ORDER  BY t.txn_at DESC
        LIMIT %s OFFSET %s
        """,
        (uid, uid, limit, offset)
    )
    return jsonify([dict(r) for r in rows])


@transactions_bp.route("/transfer", methods=["POST"])
@jwt_required()
def transfer():
    uid = int(get_jwt_identity())
    data = request.get_json() or {}
    from_acc = data.get("from_acc_id")
    to_acc = data.get("to_acc_id")
    to_account = data.get("to_account")
    amount   = data.get("amount")
    desc     = data.get("description", "")

    if not from_acc or (to_acc in (None, "") and not to_account) or amount in (None, ""):
        return jsonify({"error": "from_acc_id, destination account, and amount are required"}), 400

    # Resolve destination account flexibly:
    # - numeric account_id (e.g. 5)
    # - account number (e.g. ACC1116)
    # - numeric suffix for account number (e.g. 1116 -> ACC1116)
    resolved_to_acc = None
    if to_account:
        token = str(to_account).strip()
        if token:
            candidates = []
            if token.isdigit():
                candidates.append(("account_id", int(token)))
                candidates.append(("acc_number", f"ACC{token}"))
                candidates.append(("acc_number", token))
            else:
                candidates.append(("acc_number", token.upper()))

            for kind, value in candidates:
                if kind == "account_id":
                    row = query("SELECT account_id FROM Accounts WHERE account_id=%s", (value,), fetch="one")
                else:
                    row = query("SELECT account_id FROM Accounts WHERE UPPER(acc_number)=%s", (value,), fetch="one")
                if row:
                    resolved_to_acc = row["account_id"]
                    break

    if resolved_to_acc is None:
        try:
            resolved_to_acc = int(to_acc)
        except Exception:
            return jsonify({"error": "Invalid destination account. Use account ID or account number like ACC1116."}), 400

    if int(from_acc) == int(resolved_to_acc):
        return jsonify({"error": "Source and destination accounts cannot be the same"}), 400

    try:
        amount = float(amount)
    except Exception:
        return jsonify({"error": "Amount must be a valid number"}), 400

    if amount <= 0:
        return jsonify({"error": "Amount must be greater than zero"}), 400

    owner = query(
        "SELECT account_id FROM Accounts WHERE account_id=%s AND user_id=%s",
        (from_acc, uid), fetch="one"
    )
    if not owner:
        return jsonify({"error": "Unauthorized account"}), 403

    destination = query(
        "SELECT account_id FROM Accounts WHERE account_id=%s",
        (resolved_to_acc,), fetch="one"
    )
    if not destination:
        return jsonify({
            "error": f"Destination account not found",
            "hint": "Use a valid recipient account ID or account number (for example: 3 or ACC1116)."
        }), 404

    conn = get_db()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT transfer_money(%s,%s,%s,%s) AS result", (from_acc, resolved_to_acc, amount, desc))
            result = cur.fetchone()
            conn.commit()
        return jsonify({"message": "Transfer successful", "result": dict(result)})
    except Exception as e:
        conn.rollback()
        msg = str(e).split("CONTEXT:")[0].strip()
        if "Destination account" in msg and "not found" in msg:
            return jsonify({"error": msg, "hint": "Check the destination account_id and try again."}), 404
        return jsonify({"error": msg}), 400
    finally:
        conn.close()


@transactions_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    uid = int(get_jwt_identity())
    conn = get_db()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM dashboard_summary(%s)", (uid,))
            rows = cur.fetchall()
        return jsonify({r["metric"]: float(r["value"]) for r in rows})
    finally:
        conn.close()
