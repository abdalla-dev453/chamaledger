import uuid
from datetime import datetime, timezone
from app.extensions import db

class MpesaStatement(db.Model):
    __tablename__ = "mpesa_statements"

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    mpesa_code = db.Column(db.String(20), nullable=False)
    transaction_date = db.Column(db.DateTime(timezone=True), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    sender_phone = db.Column(db.String(15), nullable=True)
    sender_name = db.Column(db.String(120), nullable=True)
    raw_row = db.Column(db.JSON, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint("group_id", "mpesa_code", name="uq_group_mpesa_code"),
        db.Index("idx_mpesa_reconcile", "group_id", "amount", "sender_phone"),
    )

    # Relationships
    group = db.relationship("Group", back_populates="mpesa_statements")
    contribution = db.relationship("Contribution", back_populates="mpesa_statement", uselist=False)