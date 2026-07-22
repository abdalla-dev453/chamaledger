from flask import Flask, jsonify, request
from app.config import Config
from app.extensions import db, migrate, jwt


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    # Register models 
    from app import models

    # REgister Blueprints
    from app.api.v1.auth import auth_bp
    app.register_blueprint(auth_bp)

    # Custom JWT Error Handlers
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
