# app/core/decorators.py
from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt

def roles_required(*allowed_roles):
    """
    Custom decorator to enforce role claims embedded in JWT tokens.
    Usage: @roles_required('treasurer') or @roles_required('treasurer', 'member')
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Verify JWT presence and validity
            verify_jwt_in_request()
            
            # Extract custom claims
            claims = get_jwt()
            user_role = claims.get("role")

            if user_role not in allowed_roles:
                return jsonify({
                    "error": "Forbidden",
                    "message": f"Requires one of the following roles: {', '.join(allowed_roles)}"
                }), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator