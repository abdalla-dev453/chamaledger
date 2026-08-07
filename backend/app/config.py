import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "abdalla-dev-secret-key")

    basedir = os.path.abspath(os.path.dirname(__file__))
    default_sqlite_path = os.path.join(os.path.dirname(basedir), "instance", "chamaledger.db")
    database_url = os.getenv("DATABASE_URL") or os.getenv(
        "SQLALCHEMY_DATABASE_URI",
        f"sqlite:///{default_sqlite_path}",
    )

    if database_url.startswith("sqlite:///"):
        sqlite_path = database_url[10:]
        if not os.path.isabs(sqlite_path):
            sqlite_path = os.path.abspath(os.path.join(os.path.dirname(basedir), sqlite_path))
            database_url = f"sqlite:///{sqlite_path}"

    SQLALCHEMY_DATABASE_URI = database_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "abdalla-dev-jwt-secret-key")

    default_origins = (
        "http://localhost:5173,"
        "http://localhost:4173,"
        "http://localhost:5174,"
        "http://localhost:3000"
    )

    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", default_origins).split(",")
        if origin.strip()
    ]
