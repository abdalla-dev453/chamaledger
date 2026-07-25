from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy.orm import joinedload
from decimal import Decimal
from app.extensions import db
from app.models import Cycle, Group, User, Contribution, ContributionStatus
from app.core.utils import normalize_kenyan_phone
from app.core.decorators import roles_required

cycle_bp = Blueprint("cycle", __name__, url_prefix="/api/v1/cycles")

@cycle_bp.route("/<uuid:group_id>cycles/<uuid:cycle_id>/summary", methods=["GET"])
@jwt_required()
def get_cycle_summary(group_id, cycle_id):
    """
    Returns cycle financial metrics, collection progress, and alist of contributors.
    Uses joinedload to load all group numbers and contributions in a single query
    """
    # Authorization check:
    claims = get_jwt()
    if claims.get("group_id") != str(group_id):
        return jsonify({"error": "Forbidden", "message": "Access restricted to group members"}), 403

    # query cycle and group
    cycle = db.session.get(Cycle, cycle_id)
    if not cycle or cycle.group_id != group_id:
        return jsonify({"error": "Not Found", "message": "Cycle not found"}), 404

    # load all group users alongside their contributions
    # prevents N+1 problem
    members = (
        db.session.query(User)
        .filter(User.group_id == group_id, User.is_active == True)
        .options(
            joinedload(User.contributions.and_(Contribution.cycle-id == cycle_id))
        ). all()
    )

    expected_per_member = Decimal(str(cycle.expected_amount_per_member))
    total_members = len(members)
    total_expected = expected_per_member * total_members

    total_collected = Decimal("0.00")
    paid_count = 0
    partial_count = 0
    unpaid_count = 0

    defaulters = []
    member_summaries = []

    for member in members:
        # Get members contributions record for this cycle
        contrib = member.contributions[0] if member.contributions else None
        amount_paid = Decimal(str(contrib.amount_paid)) if contrib else Decimal("0.00")
        status = contrib.status if contrib else ContributionStatus.PENDING

        total_collected += amount_paid
        balance_due = expected_per_member - amount_paid

        # classic payment standing
        if amount_paid >= expected_per_member:
            paid_count += 1
            is_defaulter = False
        elif amount_paid > 0:
            partial_count += 1
            is_defaulter = False
        else:
            upaid_count += 1
            is_defaulter = True

        member_data = {
            "user_id": str(member.id),
            "full_name": member.full_name,
            "phone_number": normalize_kenyan_phone(member.phone_number),
            "amount_paid": float(amount_paid) if amount_paid > 0 else 0.00,
            "balance_due": float(balance_due) if balance_due > 0 else 0.00, 
            "status": status.value if hasattr(status, "value") else str(status),
        }


        member_summaries.append(member_data)
        if is_defaulter:
            defaulters.append(member_data)

    collection_rate = (total_collected / total_expected * 100) if total_expected > 0 else 0.00

    return jsonify({
        "group_id": str(group_id),
        "cycle": {
            "id": str(cycle.id),
            "month_year": cycle.month_year,
            "is_closed": cycle.is_closed,
            "due_date": cycle.due_date.isoformat() if cycle.due_date else None,
        },
        "financial_summary": {
            "expected_per_member": float(expected_per_member),
            "total_members": total_members,
            "total_expected": float(total_expected),
            "total_collected": float(total_collected),
            "total_deficit": float(total_expected - total_collected),
            "collection_rate_percentage": round(float(collection_rate), 2)
        },
        "breakdown": {
            "paid_in_full": paid_count,
            "partial_payment": partial_count,
            "unpaid": unpaid_count
        },
        "defaulters": defaulters,
        "members": member_summaries
    }), 200