import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from datetime import timedelta
from config import JWT_SECRET_KEY

from routes.auth         import auth_bp
from routes.accounts     import accounts_bp
from routes.transactions import transactions_bp
from routes.analytics    import analytics_bp
from routes.fraud        import fraud_bp
from routes.admin        import admin_bp

app = Flask(__name__)

# ── Config ──────────────────────────────────────────────────
app.config["JWT_SECRET_KEY"]        = JWT_SECRET_KEY
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)
app.url_map.strict_slashes = False  # Don't enforce trailing slashes

# ── Extensions ──────────────────────────────────────────────
CORS(app, 
     origins=["http://localhost:5173"], 
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     expose_headers=["Content-Type"])
JWTManager(app)

# ── Blueprints ──────────────────────────────────────────────
app.register_blueprint(auth_bp,         url_prefix="/api/auth")
app.register_blueprint(accounts_bp,     url_prefix="/api/accounts")
app.register_blueprint(transactions_bp, url_prefix="/api/transactions")
app.register_blueprint(analytics_bp,    url_prefix="/api/analytics")
app.register_blueprint(fraud_bp,        url_prefix="/api/fraud")
app.register_blueprint(admin_bp,        url_prefix="/api/admin")


@app.route("/api/health")
def health():
    return {"status": "ok", "service": "FinTrack API"}


if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", 5000))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
