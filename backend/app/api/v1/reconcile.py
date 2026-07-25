# app/api/v1/reconcile.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt

from app.extensions import db
from app.models import MpesaStatement, Contribution, User, Cycle, ContributionStatus
from app.core.decorators import roles_required

reconcile_bp = Blueprint("reconcile", __name__, url_prefix="/api/v1/reconcile")


@reconcile_bp.route("/unmatched-transactions", methods=["GET"])
@roles_required("treasurer")
def get_unmatched_transactions():
    """Lists all M-Pesa transactions that failed auto-matching."""
    claims = get_jwt()
    group_id = claims.get("group_id")

    unmatched = MpesaStatement.query.filter_by(group_id=group_id, is_matched=False).all()

    return jsonify([
        {
            "id": str(t.id),
            "transaction_code": t.transaction_code,
            "amount": float(t.amount),
            "phone_number": t.phone_number,
            "sender_name": t.sender_name,
            "created_at": t.created_at.isoformat() if t.created_at else None
        }
        for t in unmatched
    ]), 200


@reconcile_bp.route("/manual-match", methods=["POST"])
@roles_required("treasurer")
def manual_match_transaction():
    """Manually links an unmatched M-Pesa transaction to a specific member and cycle."""
    claims = get_jwt()
    group_id = claims.get("group_id")
    data = request.get_json() or {}

    transaction_id = data.get("transaction_id")
    member_id = data.get("member_id")
    cycle_id = data.get("cycle_id")

    if not transaction_id or not member_id or not cycle_id:
        return jsonify({"error": "Bad Request", "message": "transaction_id, member_id, and cycle_id are required."}), 400

    stmt = db.session.get(MpesaStatement, transaction_id)
    if not stmt or str(stmt.group_id) != group_id:
        return jsonify({"error": "Not Found", "message": "Transaction not found."}), 404

    if stmt.is_matched:
        return jsonify({"error": "Conflict", "message": "Transaction is already matched."}), 409

    member = db.session.get(User, member_id)
    cycle = db.session.get(Cycle, cycle_id)

    if not member or str(member.group_id) != group_id or not cycle or str(cycle.group_id) != group_id:
        return jsonify({"error": "Not Found", "message": "Invalid member or cycle."}), 404

    # Update or Create Contribution
    contrib = Contribution.query.filter_by(cycle_id=cycle.id, member_id=member.id).first()

    if not contrib:
        contrib = Contribution(
            group_id=group_id,
            cycle_id=cycle.id,
            member_id=member.id,
            amount_paid=stmt.amount,
            status=ContributionStatus.PAID if stmt.amount >= cycle.expected_amount_per_member else ContributionStatus.PARTIAL
        )
        db.session.add(contrib)
        db.session.flush()
    else:
        contrib.amount_paid += stmt.amount
        if contrib.amount_paid >= cycle.expected_amount_per_member:
            contrib.status = ContributionStatus.PAID
        else:
            contrib.status = ContributionStatus.PARTIAL

    stmt.is_matched = True
    stmt.contribution_id = contrib.id

    db.session.commit()

    return jsonify({
        "message": "Transaction manually matched successfully.",
        "transaction_code": stmt.transaction_code,
        "matched_to": member.full_name,
        "new_contribution_total": float(contrib.amount_paid)
    }), 200