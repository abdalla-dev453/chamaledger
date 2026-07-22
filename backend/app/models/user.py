import uuid
from datetime import datetime, timezone, date
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db
from app.models.enums import UserRole


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id = db.Column(db.UUID(as_uuid=True), db.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    phone_number = db.Column(db.String(15), nullable=False) # E.164 format (+2547...)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.Enum(UserRole), nullable=False, default=UserRole.MEMBER)
    joined_on = db.Column(db.Date, nullable=False, default=date.today)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        db.UniqueConstraint("group_id", "phone_number", name="uq_group_phone"),
    )

    # Relationships
    group = db.relationship("Group", back_populates="members")
    contribution = db.relationship("Contribution", back_populates="member", cascade="all, delete-orphan")
    loans = db.relationship("Loan", back_populates="member", cascade="all, delete-orphan")


    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)