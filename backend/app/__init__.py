from flask import Flask, jsonify
from flask_cors import CORS
from app.config import Config
from app.extensions import db, migrate, jwt


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    origins = app.config.get("CORS_ORIGINS", ["http://localhost:3000"])
    if isinstance(origins, str):
        origins = [origin.strip() for origin in origins.split(",") if origin.strip()]

    CORS(
        app,
        resources={r"/api/*": {"origins": origins}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    from app import models

    from app.api.v1.auth import auth_bp
    from app.api.v1.cycles import cycle_bp
    from app.api.v1.loans import loans_bp
    from app.api.v1.reconcile import reconcile_bp
    from app.api.v1.contributions import contributions_bp
    from app.api.v1.groups import groups_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(cycle_bp)
    app.register_blueprint(loans_bp)
    app.register_blueprint(reconcile_bp)
    app.register_blueprint(contributions_bp)
    app.register_blueprint(groups_bp)

    @jwt.unauthorized_loader
    def missing_token_callback(error_string):
        return jsonify({"error": "Unauthorized", "message": "Request missing Authorization Bearer token."}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        return jsonify({"error": "Unauthorized", "message": "Invalid JWT token."}), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Unauthorized", "message": "Token has expired."}), 401

    @app.route("/health", methods=["GET"])
    def health_check():
        return {"status": "healthy", "service": "ChamaLedger API"}, 200

    return app