# app/services/reconcile_engine.py
"""
Matches raw M-Pesa statement rows against member contributions for a cycle.

Contribution.member_id is required (NOT NULL), so a statement can only become
a Contribution once a candidate member has been identified. Matching strategy,
in order of confidence:

  1. EXACT      - the statement's sender phone matches exactly one group member.
  2. AMBIGUOUS  - no phone match, but exactly one member in the cycle is still
                  pending and the amount matches the group's expected contribution;
                  tentatively matched, pending treasurer confirmation.
  3. UNMATCHED  - neither phone nor amount narrows it down to a single member;
                  left for manual reconciliation and reported back to the caller.
"""
from decimal import Decimal
from app.extensions import db
from app.models import Contribution, ContributionMethod, ContributionStatus, MatchConfidence, User


def _find_member_by_phone(group_id, sender_phone):
    if not sender_phone:
        return None
    return User.query.filter_by(group_id=group_id, phone_number=sender_phone).first()


def _find_sole_pending_member_by_amount(cycle, amount):
    """
    If exactly one active member has no contribution yet this cycle and the
    statement amount matches the group's expected contribution, return that
    member as a tentative (ambiguous) match. Otherwise return None.
    """
    if amount != Decimal(str(cycle.group.contribution_amount)):
        return None

    already_contributed_ids = {
        c.member_id for c in Contribution.query.filter_by(cycle_id=cycle.id).all()
    }
    pending_members = [
        member for member in cycle.group.members
        if member.is_active and member.id not in already_contributed_ids
    ]

    return pending_members[0] if len(pending_members) == 1 else None


def match_statement_to_cycle(statement, cycle):
    """
    Attempts to match a single MpesaStatement row against the members of a cycle.
    Returns the created/updated Contribution, or None if no member could be identified.
    """
    amount = Decimal(str(statement.amount))

    member = _find_member_by_phone(cycle.group_id, statement.sender_phone)
    confidence = MatchConfidence.EXACT

    if not member:
        member = _find_sole_pending_member_by_amount(cycle, amount)
        confidence = MatchConfidence.AMBIGUOUS

    if not member:
        return None

    contribution = Contribution.query.filter_by(cycle_id=cycle.id, member_id=member.id).first()
    if contribution and contribution.mpesa_statement_id:
        # Member already has a matched contribution for this cycle; leave it alone.
        return contribution

    if not contribution:
        contribution = Contribution(group_id=cycle.group_id, cycle_id=cycle.id, member_id=member.id)
        db.session.add(contribution)

    contribution.amount = amount
    contribution.method = ContributionMethod.MPESA
    contribution.mpesa_code = statement.mpesa_code
    contribution.paid_on = statement.transaction_date
    contribution.mpesa_statement_id = statement.id
    contribution.match_confidence = confidence
    contribution.status = ContributionStatus.CONFIRMED if confidence == MatchConfidence.EXACT else ContributionStatus.FLAGGED

    return contribution


def reconcile_cycle(cycle, statements):
    """Runs matching for a batch of statements against a cycle. Returns a summary dict."""
    results = {"exact": 0, "ambiguous": 0, "unmatched": 0, "unmatched_statement_ids": []}

    for statement in statements:
        contribution = match_statement_to_cycle(statement, cycle)

        if contribution is None:
            results["unmatched"] += 1
            results["unmatched_statement_ids"].append(str(statement.id))
        elif contribution.match_confidence == MatchConfidence.EXACT:
            results["exact"] += 1
        else:
            results["ambiguous"] += 1

    db.session.commit()
    return results