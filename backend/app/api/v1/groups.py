# app/api/v1/groups.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from app.extensions import db
from app.models import Group, User, UserRole
from app.core.utils import normalize_kenyan_phone
from app.core.decorators import roles_required

groups_bp = Blueprint("groups", __name__, url_prefix="/api/v1/groups")


def _serialize_group(group):
    return {
        "id": str(group.id),
        "name": group.name,
        "contribution_amount": float(group.contribution_amount),
        "cycle_frequency": group.cycle_frequency,
        "member_count": len(group.members),
        "created_at": group.created_at.isoformat() if group.created_at else None,
    }


def _serialize_member(member):
    return {
        "id": str(member.id),
        "full_name": member.full_name,
        "phone_number": normalize_kenyan_phone(member.phone_number),
        "role": member.role.value,
        "joined_on": member.joined_on.isoformat() if member.joined_on else None,
        "is_active": member.is_active,
    }


@groups_bp.route("/<uuid:group_id>", methods=["GET"])
@jwt_required()
def get_group(group_id):
    """Returns details for the authenticated user's group."""
    claims = get_jwt()
    if claims.get("group_id") != str(group_id):
        return jsonify({"error": "Forbidden", "message": "Access restricted to group members"}), 403

    group = db.session.get(Group, group_id)
    if not group:
        return jsonify({"error": "Not Found", "message": "Group not found"}), 404

    return jsonify(_serialize_group(group)), 200


@groups_bp.route("/<uuid:group_id>", methods=["PATCH"])
@roles_required("treasurer")
def update_group(group_id):
    """Updates group settings (name, contribution amount, cycle frequency). Treasurer only."""
    claims = get_jwt()
    if claims.get("group_id") != str(group_id):
        return jsonify({"error": "Forbidden", "message": "Access restricted to group members"}), 403

    group = db.session.get(Group, group_id)
    if not group:
        return jsonify({"error": "Not Found", "message": "Group not found"}), 404

    data = request.get_json() or {}

    if "name" in data:
        if not data["name"]:
            return jsonify({"error": "Bad Request", "message": "name cannot be empty"}), 400
        group.name = data["name"]

    if "contribution_amount" in data:
        try:
            amount = float(data["contribution_amount"])
        except (TypeError, ValueError):
            return jsonify({"error": "Bad Request", "message": "contribution_amount must be a number"}), 400
        if amount <= 0:
            return jsonify({"error": "Bad Request", "message": "contribution_amount must be positive"}), 400
        group.contribution_amount = amount

    if "cycle_frequency" in data:
        group.cycle_frequency = data["cycle_frequency"]

    db.session.commit()

    return jsonify({"message": "Group updated successfully", "group": _serialize_group(group)}), 200


@groups_bp.route("/<uuid:group_id>/members", methods=["GET"])
@jwt_required()
def list_members(group_id):
    """Returns all members of the group."""
    claims = get_jwt()
    if claims.get("group_id") != str(group_id):
        return jsonify({"error": "Forbidden", "message": "Access restricted to group members"}), 403

    members = User.query.filter_by(group_id=group_id).order_by(User.joined_on.asc()).all()

    return jsonify({"members": [_serialize_member(m) for m in members]}), 200


@groups_bp.route("/<uuid:group_id>/members/<uuid:member_id>", methods=["PATCH"])
@roles_required("treasurer")
def update_member(group_id, member_id):
    """Updates a member's role or active status. Treasurer only."""
    claims = get_jwt()
    if claims.get("group_id") != str(group_id):
        return jsonify({"error": "Forbidden", "message": "Access restricted to group members"}), 403

    member = db.session.get(User, member_id)
    if not member or member.group_id != group_id:
        return jsonify({"error": "Not Found", "message": "Member not found"}), 404

    data = request.get_json() or {}

    if "role" in data:
        try:
            member.role = UserRole(data["role"])
        except ValueError:
            return jsonify({"error": "Bad Request", "message": "Invalid role"}), 400

    if "is_active" in data:
        member.is_active = bool(data["is_active"])

    db.session.commit()

    return jsonify({"message": "Member updated successfully", "member": _serialize_member(member)}), 200