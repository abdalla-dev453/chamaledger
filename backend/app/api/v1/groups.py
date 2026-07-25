# app/api/v1/groups.py
from decimal import Decimal
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt

from app.extensions import db
from app.models import Group, User
from app.core.decorators import roles_required

groups_bp = Blueprint("groups", __name__, url_prefix="/api/v1/groups")


@groups_bp.route("/current", methods=["GET"])
@jwt_required()
def get_current_group():
    """Retrieves details of the authenticated user's Chama group."""
    claims = get_jwt()
    group_id = claims.get("group_id")

    group = db.session.get(Group, group_id)
    if not group:
        return jsonify({"error": "Not Found", "message": "Group not found."}), 404

    return jsonify({
        "id": str(group.id),
        "name": group.name,
        "contribution_amount": float(group.contribution_amount),
        "cycle_frequency": group.cycle_frequency,
        "member_count": len(group.members),
        "created_at": group.created_at.isoformat() if group.created_at else None
    }), 200


@groups_bp.route("/current/settings", methods=["PATCH"])
@roles_required("treasurer")
def update_group_settings():
    """Updates group contribution rules or name (Treasurer only)."""
    claims = get_jwt()
    group_id = claims.get("group_id")
    group = db.session.get(Group, group_id)

    data = request.get_json() or {}

    if "name" in data:
        group.name = data["name"]
    if "contribution_amount" in data:
        try:
            group.contribution_amount = Decimal(str(data["contribution_amount"]))
        except (ValueError, TypeError):
            return jsonify({"error": "Bad Request", "message": "Invalid contribution_amount."}), 400
    if "cycle_frequency" in data:
        group.cycle_frequency = data["cycle_frequency"]

    db.session.commit()

    return jsonify({
        "message": "Group settings updated successfully.",
        "group": {
            "id": str(group.id),
            "name": group.name,
            "contribution_amount": float(group.contribution_amount),
            "cycle_frequency": group.cycle_frequency
        }
    }), 200


@groups_bp.route("/current/members", methods=["GET"])
@jwt_required()
def get_group_members():
    """Lists all active members in the current Chama group."""
    claims = get_jwt()
    group_id = claims.get("group_id")

    members = User.query.filter_by(group_id=group_id, is_active=True).all()

    return jsonify([
        {
            "id": str(m.id),
            "full_name": m.full_name,
            "phone_number": m.phone_number,
            "role": m.role.value if hasattr(m.role, "value") else str(m.role),
            "joined_at": m.created_at.isoformat() if m.created_at else None
        }
        for m in members
    ]), 200