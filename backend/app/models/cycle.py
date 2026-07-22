import uuid
from datetime import datetime, timezone
from app.extensions import db
from app.models.enums import CycleStatus


class  Cycle(db.Model):
    __tablename__ = "cycles"

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    period_start = db.Column(db.Date, nullable=False)
    period_end = db.Column(db.Date, nullable=False)
    status = db.Column(db.Enum(CycleStatus), nullable=False, default=CycleStatus.ACTIVE)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.CheckConstraint("period_end >= period_start", name="check_cycle_dates"),
    )

    # Relationships
    group = db.relationship("Group", back_populates="cycles")
    contributions = db.relationship("Contribution", back_populates="cycle", cascade="all, delete-orphan")