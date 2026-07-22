import enum


# these are the enumas for the models to help with type checking and validation
class UserRole(str, enum.Enum):
    TREASURER = "treasurer"
    MEMBER = "member"

class CycleStatus(str, enum.Enum):
    ACTIVE = "active"
    CLOSED = "closed"
    ARCHIVED = "archived"

class ContributionStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    LATE = "late"
    FLAGGED = "flagged"

class ContributionMethod(str, enum.Enum):
    MPESA = "mpesa"
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"

class LoanStatus(str, enum.Enum):
    PENDING = "pending"
    DISBURSED = "disbursed"
    CLEARED = "cleared"
    DEFAULTED = "defaulted"

class MatchConfidence(str, enum.Enum):
    EXACT = "exact"
    AMBIGUOUS = "ambiguous"
    UNMATCHED = "unmatched"