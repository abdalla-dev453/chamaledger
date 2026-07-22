import uuid
from datetime import datetime, timezone
from app.extensions import db
from app.models.enums import ContributionStatus, ContributionMethod, MatchConfidence

class Contribution(db.Model):
    __tablename__ = "contributions"

    # primary key and foreign keys
    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    cycle_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey("cycles.id", ondelete="CASCADE"), nullable=False)
    member_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    mpesa_statement_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey("mpesa_statements.id", ondelete="SET NULL"), unique=True, nullable=True)

    # columns
    amount = db.Column(db.Numeric(12, 2), nullable=False, default=0.00)
    method = db.Column(db.Enum(ContributionMethod), nullable=False, default=ContributionMethod.MPESA)
    mpesa_code = db.Column(db.String(20), nullable=True)
    paid_on = db.Column(db.DateTime(timezone=True), nullable=True)
    status = db.Column(db.Enum(ContributionStatus), nullable=False, default=ContributionStatus.PENDING)
    match_confidence = db.Column(db.Enum(MatchConfidence), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # indexes
    __table_args__ = (
        db.UniqueConstraint("member_id", "cycle_id", name="uq_member_cycle"),
        db.Index("idx_contributions_cycle_status", "cycle_id", "status", "amount"),
    )

    # Relationships
    group = db.relationship("Group")
    cycle = db.relationship("Cycle", back_populates="contributions")
    member = db.relationship("User", back_populates="contributions")
    mpesa_statement = db.relationship("MpesaStatement", back_populates="contribution")