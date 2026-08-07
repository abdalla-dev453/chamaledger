import uuid
from datetime import datetime, timezone
from app.extensions import db


class MpesaTransaction(db.Model):
    __tablename__ = "mpesa_transactions"

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = db.Column(
        db.UUID(as_uuid=True), db.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False
    )
    member_id = db.Column(
        db.UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    phone_number = db.Column(db.String(20), nullable=True)
    checkout_request_id = db.Column(db.String(120), nullable=True, unique=True)
    merchant_request_id = db.Column(db.String(120), nullable=True, unique=True)
    mpesa_receipt = db.Column(db.String(64), nullable=True)
    status = db.Column(db.String(20), nullable=False, default="PENDING")
    purpose = db.Column(db.String(32), nullable=True)  # e.g. 'contribution' | 'repayment'
    target_id = db.Column(db.UUID(as_uuid=True), nullable=True)  # cycle_id or loan_id
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    group = db.relationship("Group", backref=db.backref("mpesa_transactions", lazy="dynamic"))
    member = db.relationship("User", backref=db.backref("mpesa_transactions", lazy="dynamic"))

    def mark_success(self, receipt, phone=None, amount=None):
        self.status = "SUCCESS"
        if receipt:
            self.mpesa_receipt = receipt
        if phone:
            self.phone_number = phone
        if amount is not None:
            self.amount = amount
