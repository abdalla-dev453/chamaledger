from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy.orm import joinedload
from decimal import Decimal
from datetime import date
from app.extensions import db
from app.models import Cycle, Group, User, Contribution, ContributionStatus, CycleStatus
from app.core.utils import normalize_kenyan_phone
from app.core.decorators import roles_required

cycle_bp = Blueprint("cycle", __name__, url_prefix="/api/v1/cycles")


# List cycles
@cycle_bp.route("/<uuid:group_id>", methods=["GET"])
@jwt_required()
def list_cycles(group_id):
    """Returns all cycles for a group, most recent first."""
    claims = get_jwt()
    if claims.get("group_id") != str(group_id):
        return jsonify({"error": "Forbidden", "message": "Access restricted to group members"}), 403

    cycles = (
        Cycle.query
        .filter_by(group_id=group_id)
        .order_by(Cycle.period_start.desc())
        .all()
    )

    return jsonify({
        "cycles": [
            {
                "id": str(cycle.id),
                "period_start": cycle.period_start.isoformat(),
                "period_end": cycle.period_end.isoformat(),
                "status": cycle.status.value,
            }
            for cycle in cycles
        ]
    }), 200


# Create cycle
@cycle_bp.route("/<uuid:group_id>", methods=["POST"])
@roles_required("treasurer")
def create_cycle(group_id):
    """Opens a new contribution cycle for the group. Treasurer only."""
    claims = get_jwt()
    if claims.get("group_id") != str(group_id):
        return jsonify({"error": "Forbidden", "message": "Access restricted to group members"}), 403

    group = db.session.get(Group, group_id)
    if not group:
        return jsonify({"error": "Not Found", "message": "Group not found"}), 404

    data = request.get_json() or {}

    try:
        period_start = date.fromisoformat(data.get("period_start", ""))
        period_end = date.fromisoformat(data.get("period_end", ""))
    except (TypeError, ValueError):
        return jsonify({"error": "Bad Request", "message": "period_start and period_end must be valid ISO dates"}), 400

    if period_end < period_start:
        return jsonify({"error": "Bad Request", "message": "period_end cannot be before period_start"}), 400

    cycle = Cycle(
        group_id=group.id,
        period_start=period_start,
        period_end=period_end,
        status=CycleStatus.ACTIVE,
    )
    db.session.add(cycle)
    db.session.commit()

    return jsonify({
        "message": "Cycle created successfully",
        "cycle": {
            "id": str(cycle.id),
            "period_start": cycle.period_start.isoformat(),
            "period_end": cycle.period_end.isoformat(),
            "status": cycle.status.value,
        }
    }), 201


# Close cycle
@cycle_bp.route("/<uuid:group_id>/<uuid:cycle_id>/close", methods=["PATCH"])
@roles_required("treasurer")
def close_cycle(group_id, cycle_id):
    """Marks a cycle as closed so no further contributions are recorded against it. Treasurer only."""
    claims = get_jwt()
    if claims.get("group_id") != str(group_id):
        return jsonify({"error": "Forbidden", "message": "Access restricted to group members"}), 403

    cycle = db.session.get(Cycle, cycle_id)
    if not cycle or cycle.group_id != group_id:
        return jsonify({"error": "Not Found", "message": "Cycle not found"}), 404

    if cycle.status != CycleStatus.ACTIVE:
        return jsonify({"error": "Bad Request", "message": "Only active cycles can be closed"}), 400

    cycle.status = CycleStatus.CLOSED
    db.session.commit()

    return jsonify({"message": "Cycle closed successfully", "cycle_id": str(cycle.id)}), 200


# Cycle summary
@cycle_bp.route("/<uuid:group_id>/<uuid:cycle_id>/summary", methods=["GET"])
@jwt_required()
def get_cycle_summary(group_id, cycle_id):
    """
    Returns cycle financial metrics, collection progress, and a list of contributors.
    Uses joinedload to load all group members and contributions in a single query.
    """
    claims = get_jwt()
    if claims.get("group_id") != str(group_id):
        return jsonify({"error": "Forbidden", "message": "Access restricted to group members"}), 403

    cycle = db.session.get(Cycle, cycle_id)
    if not cycle or cycle.group_id != group_id:
        return jsonify({"error": "Not Found", "message": "Cycle not found"}), 404

    # load all group members alongside their contributions for this cycle
    # prevents N+1 problem
    members = (
        db.session.query(User)
        .filter(User.group_id == group_id, User.is_active == True)
        .options(
            joinedload(User.contributions.and_(Contribution.cycle_id == cycle_id))
        ).all()
    )

    expected_per_member = Decimal(str(cycle.group.contribution_amount))
    total_members = len(members)
    total_expected = expected_per_member * total_members

    total_collected = Decimal("0.00")
    paid_count = 0
    partial_count = 0
    unpaid_count = 0

    defaulters = []
    member_summaries = []

    for member in members:
        contrib = member.contributions[0] if member.contributions else None
        amount_paid = Decimal(str(contrib.amount)) if contrib else Decimal("0.00")
        status = contrib.status if contrib else ContributionStatus.PENDING

        total_collected += amount_paid
        balance_due = expected_per_member - amount_paid

        if amount_paid >= expected_per_member:
            paid_count += 1
            is_defaulter = False
        elif amount_paid > 0:
            partial_count += 1
            is_defaulter = False
        else:
            unpaid_count += 1
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

    collection_rate = (total_collected / total_expected * 100) if total_expected > 0 else Decimal("0.00")

    return jsonify({
        "group_id": str(group_id),
        "cycle": {
            "id": str(cycle.id),
            "period_start": cycle.period_start.isoformat(),
            "period_end": cycle.period_end.isoformat(),
            "status": cycle.status.value,
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