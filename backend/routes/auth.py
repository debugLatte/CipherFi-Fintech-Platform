from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import bcrypt
from config import query

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    user = query(
        "SELECT user_id, full_name, email, pass_hash, role, is_active FROM Users WHERE email = %s",
        (email,), fetch="one"
    )

    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
    if user["is_active"] == "N":
        return jsonify({"error": "Account locked. Contact support."}), 403
    if not bcrypt.checkpw(password.encode(), user["pass_hash"].encode()):
        try:
            query("INSERT INTO LoginHistory(user_id, ip_address, success) VALUES (%s,%s,'N')",
                  (user["user_id"], request.remote_addr), fetch=None)
        except Exception:
            pass
        return jsonify({"error": "Invalid credentials"}), 401

    try:
        query("INSERT INTO LoginHistory(user_id, ip_address, success) VALUES (%s,%s,'Y')",
              (user["user_id"], request.remote_addr), fetch=None)
    except Exception:
        pass

    token = create_access_token(
        identity=str(user["user_id"]),
        additional_claims={"role": user["role"], "name": user["full_name"]}
    )
    return jsonify({
        "token": token,
        "user": {"user_id": user["user_id"], "full_name": user["full_name"],
                 "email": user["email"], "role": user["role"]}
    })


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    phone = data.get("phone", "")

    if not all([full_name, email, password]):
        return jsonify({"error": "Name, email and password required"}), 400

    existing = query("SELECT user_id FROM Users WHERE email=%s", (email,), fetch="one")
    if existing:
        return jsonify({"error": "Email already registered"}), 409

    pass_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user = query(
        "INSERT INTO Users(full_name,email,pass_hash,phone) VALUES(%s,%s,%s,%s) RETURNING user_id,full_name,email,role",
        (full_name, email, pass_hash, phone), fetch="one"
    )
    token = create_access_token(
        identity=str(user["user_id"]),
        additional_claims={"role": user["role"], "name": user["full_name"]}
    )
    return jsonify({"token": token, "user": dict(user)}), 201


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    uid = int(get_jwt_identity())
    user = query(
        "SELECT user_id,full_name,email,phone,role,is_active,created_at FROM Users WHERE user_id=%s",
        (uid,), fetch="one"
    )
    return jsonify(dict(user)) if user else (jsonify({"error": "Not found"}), 404)


@auth_bp.route("/login-history", methods=["GET"])
@jwt_required()
def login_history():
    uid = int(get_jwt_identity())
    rows = query(
        "SELECT login_id,login_time,ip_address,success FROM LoginHistory WHERE user_id=%s ORDER BY login_time DESC LIMIT 20",
        (uid,)
    )
    return jsonify([dict(r) for r in rows])
