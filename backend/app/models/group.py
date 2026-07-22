import uuid
from datetime import datetime, timezone
from app.extensions import db


class Group(db.Model):
    __tablename__ = "groups"

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = db.Column(db.String(120), nullable=False)
    contribution_amount = db.Column(db.Numeric(12, 2), nullable=False)
    cycle_frequency = db.Column(db.String(20), nullable=False, default="monthly")
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    members = db.relationship("User", back_populates="group", cascade="all, delete-orphan")
    cycles = db.relationship("Cycle", back_populates="group", cascade="all, delete-orphan")
    loans = db.relationship("Loan", back_populates="group", cascade="all, delete-orphan")
    mpesa_statements = db.relationship("MpesaStatement", back_populates="group", cascade="all, delete-orphan")