# app/api/v1/contributions.py
from decimal import Decimal
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

from app.extensions import db
from app.models import Contribution, Cycle, User, ContributionStatus
from app.core.decorators import roles_required

contributions_bp = Blueprint("contributions", __name__, url_prefix="/api/v1/contributions")


@contributions_bp.route("/record", methods=["POST"])
@roles_required("treasurer")
def record_manual_contribution():
    """Manually records or tops up a member's contribution for a cycle (e.g., cash or direct deposit)."""
    claims = get_jwt()
    group_id = claims.get("group_id")
    data = request.get_json() or {}

    member_id = data.get("member_id")
    cycle_id = data.get("cycle_id")

    try:
        amount_paid = Decimal(str(data.get("amount", 0)))
    except (ValueError, TypeError):
        return jsonify({"error": "Bad Request", "message": "Invalid payment amount."}), 400

    if not member_id or not cycle_id or amount_paid <= 0:
        return jsonify({"error": "Bad Request", "message": "member_id, cycle_id, and a positive amount are required."}), 400

    cycle = db.session.get(Cycle, cycle_id)
    if not cycle or str(cycle.group_id) != group_id:
        return jsonify({"error": "Not Found", "message": "Cycle not found."}), 404

    member = db.session.get(User, member_id)
    if not member or str(member.group_id) != group_id:
        return jsonify({"error": "Not Found", "message": "Member not found in this group."}), 404

    contrib = Contribution.query.filter_by(cycle_id=cycle.id, member_id=member.id).first()

    if not contrib:
        contrib = Contribution(
            group_id=group_id,
            cycle_id=cycle.id,
            member_id=member.id,
            amount_paid=amount_paid,
            status=ContributionStatus.PAID if amount_paid >= cycle.expected_amount_per_member else ContributionStatus.PARTIAL
        )
        db.session.add(contrib)
    else:
        contrib.amount_paid += amount_paid
        if contrib.amount_paid >= cycle.expected_amount_per_member:
            contrib.status = ContributionStatus.PAID
        else:
            contrib.status = ContributionStatus.PARTIAL

    db.session.commit()

    return jsonify({
        "message": "Contribution recorded successfully.",
        "contribution": {
            "id": str(contrib.id),
            "member_id": str(contrib.member_id),
            "cycle_id": str(contrib.cycle_id),
            "total_paid": float(contrib.amount_paid),
            "status": contrib.status.value if hasattr(contrib.status, "value") else str(contrib.status)
        }
    }), 200


@contributions_bp.route("/history", methods=["GET"])
@jwt_required()
def get_user_contributions():
    """Returns contribution history for the logged-in member or a specified member."""
    user_id = get_jwt_identity()
    claims = get_jwt()
    group_id = claims.get("group_id")

    target_user_id = request.args.get("user_id", user_id)

    # Member can view their own, Treasurer can view any in the group
    if target_user_id != user_id and claims.get("role") != "treasurer":
        return jsonify({"error": "Forbidden", "message": "Cannot view another member's contributions."}), 403

    contributions = (
        Contribution.query.filter_by(group_id=group_id, member_id=target_user_id)
        .order_by(Contribution.created_at.desc())
        .all()
    )

    return jsonify([
        {
            "id": str(c.id),
            "cycle_id": str(c.cycle_id),
            "cycle_month": c.cycle.month_year if c.cycle else None,
            "amount_paid": float(c.amount_paid),
            "status": c.status.value if hasattr(c.status, "value") else str(c.status),
            "updated_at": c.updated_at.isoformat() if c.updated_at else None
        }
        for c in contributions
    ]), 200