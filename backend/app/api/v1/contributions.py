# app/api/v1/contributions.py
import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, timezone
from app.extensions import db
from app.models import Contribution, Cycle, User, ContributionMethod, ContributionStatus
from app.core.decorators import roles_required

contributions_bp = Blueprint("contributions", __name__, url_prefix="/api/v1/contributions")


def _serialize_contribution(contribution):
    return {
        "id": str(contribution.id),
        "cycle_id": str(contribution.cycle_id),
        "member_id": str(contribution.member_id),
        "member_name": contribution.member.full_name if contribution.member else None,
        "amount": float(contribution.amount),
        "method": contribution.method.value,
        "mpesa_code": contribution.mpesa_code,
        "paid_on": contribution.paid_on.isoformat() if contribution.paid_on else None,
        "status": contribution.status.value,
        "match_confidence": contribution.match_confidence.value if contribution.match_confidence else None,
    }


# List contributions for a cycle
@contributions_bp.route("/<uuid:group_id>/cycles/<uuid:cycle_id>", methods=["GET"])
@jwt_required()
def list_contributions(group_id, cycle_id):
    """Returns all contributions recorded for a cycle. Members see only their own; treasurers see all."""
    claims = get_jwt()
    if claims.get("group_id") != str(group_id):
        return jsonify({"error": "Forbidden", "message": "Access restricted to group members"}), 403

    cycle = db.session.get(Cycle, cycle_id)
    if not cycle or cycle.group_id != group_id:
        return jsonify({"error": "Not Found", "message": "Cycle not found"}), 404

    query = Contribution.query.filter_by(cycle_id=cycle_id)
    if claims.get("role") != "treasurer":
        query = query.filter_by(member_id=uuid.UUID(get_jwt_identity()))

    contributions = query.order_by(Contribution.created_at.desc()).all()

    return jsonify({"contributions": [_serialize_contribution(c) for c in contributions]}), 200


# Record a manual contribution (cash / bank transfer)
@contributions_bp.route("/<uuid:group_id>/cycles/<uuid:cycle_id>", methods=["POST"])
@roles_required("treasurer")
def record_contribution(group_id, cycle_id):
    """Manually records a member's contribution (cash or bank transfer). Treasurer only."""
    claims = get_jwt()
    if claims.get("group_id") != str(group_id):
        return jsonify({"error": "Forbidden", "message": "Access restricted to group members"}), 403

    cycle = db.session.get(Cycle, cycle_id)
    if not cycle or cycle.group_id != group_id:
        return jsonify({"error": "Not Found", "message": "Cycle not found"}), 404

    data = request.get_json() or {}
    raw_member_id = data.get("member_id")
    amount = data.get("amount")
    method = data.get("method", "cash")

    if not raw_member_id or amount is None:
        return jsonify({"error": "Bad Request", "message": "member_id and amount are required fields"}), 400

    try:
        member_id = uuid.UUID(str(raw_member_id))
    except ValueError:
        return jsonify({"error": "Bad Request", "message": "member_id must be a valid UUID"}), 400

    member = db.session.get(User, member_id)
    if not member or member.group_id != group_id:
        return jsonify({"error": "Not Found", "message": "Member not found in this group"}), 404

    try:
        method_enum = ContributionMethod(method)
    except ValueError:
        return jsonify({"error": "Bad Request", "message": "Invalid contribution method"}), 400

    existing = Contribution.query.filter_by(cycle_id=cycle_id, member_id=member_id).first()
    if existing:
        return jsonify({"error": "Conflict", "message": "A contribution already exists for this member in this cycle"}), 409

    contribution = Contribution(
        group_id=group_id,
        cycle_id=cycle_id,
        member_id=member_id,
        amount=amount,
        method=method_enum,
        mpesa_code=data.get("mpesa_code"),
        paid_on=datetime.now(timezone.utc),
        status=ContributionStatus.CONFIRMED,
    )
    db.session.add(contribution)
    db.session.commit()

    return jsonify({
        "message": "Contribution recorded successfully",
        "contribution": _serialize_contribution(contribution)
    }), 201


# Update contribution status (confirm / flag)
@contributions_bp.route("/<uuid:group_id>/<uuid:contribution_id>", methods=["PATCH"])
@roles_required("treasurer")
def update_contribution_status(group_id, contribution_id):
    """Updates a contribution's status, e.g. to resolve a flagged reconciliation match. Treasurer only."""
    claims = get_jwt()
    if claims.get("group_id") != str(group_id):
        return jsonify({"error": "Forbidden", "message": "Access restricted to group members"}), 403

    contribution = db.session.get(Contribution, contribution_id)
    if not contribution or contribution.group_id != group_id:
        return jsonify({"error": "Not Found", "message": "Contribution not found"}), 404

    data = request.get_json() or {}
    status = data.get("status")

    try:
        contribution.status = ContributionStatus(status)
    except ValueError:
        return jsonify({"error": "Bad Request", "message": "Invalid status"}), 400

    db.session.commit()

    return jsonify({
        "message": "Contribution updated successfully",
        "contribution": _serialize_contribution(contribution)
    }), 200