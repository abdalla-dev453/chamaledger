from flask import Flask
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
    @app.route("/health", methods=["GET"])
    def health_check():
        return {"status": "healthy", "service": "chamaledger API"}, 200

    return app
