# app/services/loan_engine.py
"""
Business rules for loan eligibility and disbursement limits.
Kept separate from the API layer so the lending policy can evolve
independently of the request/response handling in app.api.v1.loans.
"""
from decimal import Decimal
from app.models import LoanStatus


# A member's loan principal cannot exceed this multiple of their total confirmed contributions.
MAX_LOAN_TO_SAVINGS_RATIO = Decimal("3.0")


def total_confirmed_savings(member) -> Decimal:
    """Sums a member's confirmed contributions across all cycles."""
    from app.models import ContributionStatus

    return sum(
        (Decimal(str(c.amount)) for c in member.contributions if c.status == ContributionStatus.CONFIRMED),
        Decimal("0.00"),
    )


def has_active_loan(member) -> bool:
    """A member with an outstanding (non-cleared, non-defaulted) loan is not eligible for a new one."""
    return any(
        loan.status in (LoanStatus.PENDING, LoanStatus.DISBURSED)
        for loan in member.loans
    )


def max_eligible_principal(member) -> Decimal:
    """Returns the maximum principal a member is currently eligible to borrow."""
    return total_confirmed_savings(member) * MAX_LOAN_TO_SAVINGS_RATIO


def check_loan_eligibility(member, principal: Decimal) -> tuple[bool, str | None]:
    """
    Validates whether a member can be issued a loan of the given principal.
    Returns (is_eligible, reason_if_not).
    """
    if has_active_loan(member):
        return False, "Member already has an active loan"

    max_principal = max_eligible_principal(member)
    if principal > max_principal:
        return False, f"Requested principal exceeds eligible limit of {max_principal:.2f}"

    return True, None