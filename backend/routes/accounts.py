from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from config import query

accounts_bp = Blueprint("accounts", __name__)


@accounts_bp.route("/", methods=["GET"])
@jwt_required()
def get_accounts():
    uid = int(get_jwt_identity())
    rows = query(
        "SELECT account_id,acc_number,acc_type,balance,currency,is_frozen,created_at FROM Accounts WHERE user_id=%s ORDER BY created_at",
        (uid,)
    )
    return jsonify([dict(r) for r in rows])


@accounts_bp.route("/", methods=["POST"])
@jwt_required()
def create_account():
    uid = int(get_jwt_identity())
    data = request.get_json() or {}
    acc_type = data.get("acc_type", "SAVINGS").upper()
    acc_number = data.get("acc_number", "").strip()

    if acc_type not in ("SAVINGS", "CURRENT"):
        return jsonify({"error": "acc_type must be SAVINGS or CURRENT"}), 400
    if not acc_number:
        return jsonify({"error": "acc_number required"}), 400

    exists = query("SELECT account_id FROM Accounts WHERE acc_number=%s", (acc_number,), fetch="one")
    if exists:
        return jsonify({"error": "Account number already exists"}), 409

    row = query(
        "INSERT INTO Accounts(user_id,acc_number,acc_type) VALUES(%s,%s,%s) RETURNING *",
        (uid, acc_number, acc_type), fetch="one"
    )
    return jsonify(dict(row)), 201


@accounts_bp.route("/overview", methods=["GET"])
@jwt_required()
def overview():
    uid = int(get_jwt_identity())
    row = query("SELECT * FROM AccountOverview WHERE user_id=%s", (uid,), fetch="one")
    return jsonify(dict(row) if row else {})
