# app/api/v1/auth.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from app.extensions import db
from app.models import User, Group, UserRole
from app.core.utils import normalize_kenyan_phone
from app.core.decorators import roles_required

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")


# Routes
# Register
@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Register a new user under an existing or newly created Group.
    If no group_id is passed, creates a new group and sets caller as TREASURER.
    """

    data = request.get_json()

    full_name = data.get("full_name")
    phone_number = normalize_kenyan_phone(data.get("phone_number"))
    password = data.get("password")
    group_id = data.get("group_id")
    group_name = data.get("group_name")

    if not full_name or not phone_number or not password:
        return jsonify({"error": "Bad Request", "message": "full_name, phone_number and password are required fields"}), 400

    # Handle Group assignment or creation
    if group_id:
        group = db.session.get(Group, group_id)
        if not group:
            return jsonify({"error": "Not Found", "message": "Specified group does not exist"}), 404
        user_role = UserRole.MEMBER
    elif group_name:
        group = Group(
            name=group_name,
            contribution_amount=data.get("contribution_amount", 200.00),
            cycle_frequency=data.get("cycle_frequency", "monthly"),
        )
        db.session.add(group)
        db.session.flush() # Get group_id
        user_role = UserRole.TREASURER
    else:
        return jsonify({"error": "Bad Request", "message": "group_id or group_name is required"}), 400


    # Check unique constraint (group_id, phone_number)
    existing_user = User.query.filter_by(group_id=group.id, phone_number=phone_number).first()
    if existing_user:
        return jsonify({"error": "Conflict", "message": "User already exists"}), 409


    # Create User
    new_user = User(
        group_id=group.id,
        full_name=full_name,
        phone_number=phone_number,
        role=user_role,
    )
    new_user.set_password(password)

    db.session.add(new_user)
    db.session.commit()

    # generate token with custom claims
    additional_claims = {
        "group_id": str(group.id),
        "role": new_user.role.value,
        "full_name": new_user.full_name,
    }
    access_token = create_access_token(identity=str(new_user.id), additional_claims=additional_claims)

    return jsonify({
        "message": "User registered successfully",
        "access_token": access_token,
        "user": {
            "id": str(new_user.id),
            "group_id": str(group.id),
            "full_name": new_user.full_name,
            "phone_number": new_user.phone_number,
            "role": new_user.role.value,
            "group_id": str(group.id),
        }
    }), 201



# Login
@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticates user via phone number & password"""
    data = request.get_json()

    phone_number = normalize_kenyan_phone(data.get("phone_number"))
    password = data.get("password")

    if not phone_number or not password:
        return jsonify({"error": "Bad Request", "message": "phone_number and password are required fields"}), 400

    # Query user across groups or by specific group if provided
    user = User.query.filter_by(phone_number=phone_number).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Unauthorized", "message": "Invalid phone number or password"}), 401

    if not user.is_active:
        return jsonify({"error": "Forbidden", "message": "Account is inactive"}), 401

    # Generate token with custom claims
    additional_claims = {
        "group_id": str(user.group_id),
        "role": user.role.value,
        "full_name": user.full_name,
    }
    access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)

    return jsonify({
        "access_token": access_token,
        "user": {
            "id": str(user.id),
            "group_id": str(user.group_id),
            "full_name": user.full_name,
            "phone_number": user.phone_number,
            "role": user.role.value,
            "group_id": str(user.group_id),
        }
    }), 201


# Logout
@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    return jsonify({"message": "Logged out successfully"}), 200

# profile
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    """Returns profile info for current authenticated token."""
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)

    if not user:
        return jsonify({"error": "Not Found", "message": "User not found."}), 404

    return jsonify({
        "id": str(user.id),
        "full_name": user.full_name,
        "phone_number": user.phone_number,
        "role": user.role.value,
        "group_id": str(user.group_id),
        "group_name": user.group.name
    }), 200