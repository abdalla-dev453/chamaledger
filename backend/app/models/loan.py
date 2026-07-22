import uuid
from datetime import datetime, timezone
from app.extensions import db
from app.models.enums import LoanStatus

class Loan(db.Model):
    __tablename__ = "loans"

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    member_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    principal = db.Column(db.Numeric(12, 2), nullable=False)
    interest_rate = db.Column(db.Numeric(5, 2), nullable=False, default=0.00) # e.g. 10.00 for 10%
    issued_on = db.Column(db.Date, nullable=False)
    due_on = db.Column(db.Date, nullable=False)
    status = db.Column(db.Enum(LoanStatus), nullable=False, default=LoanStatus.PENDING)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.Index("idx_loans_member_status", "member_id", "status"),
    )

    # Relationships
    group = db.relationship("Group", back_populates="loans")
    member = db.relationship("User", back_populates="loans")
    repayments = db.relationship("Repayment", back_populates="loan", cascade="all, delete-orphan")

    @property
    def total_payable(self):
        """Simple interest calculation: principal * (1 + rate / 100)"""
        return float(self.principal) * (1 + (float(self.interest_rate) / 100))

    @property
    def total_paid(self):
        return sum(float(r.amount) for r in self.repayments)

    @property
    def remaining_balance(self):
        return self.total_payable - self.total_paid


# Repayment Model 
class Repayment(db.Model):
    __tablename__ = "repayments"

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    loan_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey("loans.id", ondelete="CASCADE"), nullable=False)
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    mpesa_code = db.Column(db.String(20), nullable=True)
    paid_on = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.Index("idx_repayments_loan", "loan_id"),
    )

    # Relationships
    loan = db.relationship("Loan", back_populates="repayments")