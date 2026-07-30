# app/api/v1/loans.py
import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, timezone, date
from decimal import Decimal, InvalidOperation
from app.extensions import db
from app.models import Loan, Repayment, User, LoanStatus
from app.core.decorators import roles_required
from app.services.loan_engine import check_loan_eligibility

loans_bp = Blueprint("loans", __name__, url_prefix="/api/v1/loans")


def _serialize_loan(loan):
    return {
        "id": str(loan.id),
        "member_id": str(loan.member_id),
        "member_name": loan.member.full_name if loan.member else None,
        "principal": float(loan.principal),
        "interest_rate": float(loan.interest_rate),
        "total_payable": loan.total_payable,
        "total_paid": loan.total_paid,
        "remaining_balance": loan.remaining_balance,
        "issued_on": loan.issued_on.isoformat(),
        "due_on": loan.due_on.isoformat(),
        "status": loan.status.value,
    }


# List loans for a group
@loans_bp.route("/<uuid:group_id>", methods=["GET"])
@jwt_required()
def list_loans(group_id):
    """Returns loans for the group. Members see only their own; treasurers see all."""
    claims = get_jwt()
    if claims.get("group_id") != str(group_id):
        return jsonify({"error": "Forbidden", "message": "Access restricted to group members"}), 403

    query = Loan.query.filter_by(group_id=group_id)
    if claims.get("role") != "treasurer":
        query = query.filter_by(member_id=uuid.UUID(get_jwt_identity()))

    loans = query.order_by(Loan.issued_on.desc()).all()

    return jsonify({"loans": [_serialize_loan(loan) for loan in loans]}), 200


# Issue a loan
@loans_bp.route("/<uuid:group_id>", methods=["POST"])
@roles_required("treasurer")
def issue_loan(group_id):
    """Issues a new loan to a member, subject to eligibility rules. Treasurer only."""
    claims = get_jwt()
    if claims.get("group_id") != str(group_id):
        return jsonify({"error": "Forbidden", "message": "Access restricted to group members"}), 403

    data = request.get_json() or {}
    raw_member_id = data.get("member_id")

    if not raw_member_id or data.get("principal") is None or not data.get("due_on"):
        return jsonify({"error": "Bad Request", "message": "member_id, principal and due_on are required fields"}), 400

    try:
        member_id = uuid.UUID(str(raw_member_id))
    except ValueError:
        return jsonify({"error": "Bad Request", "message": "member_id must be a valid UUID"}), 400

    member = db.session.get(User, member_id)
    if not member or member.group_id != group_id:
        return jsonify({"error": "Not Found", "message": "Member not found in this group"}), 404

    try:
        principal = Decimal(str(data["principal"]))
        interest_rate = Decimal(str(data.get("interest_rate", "0.00")))
    except InvalidOperation:
        return jsonify({"error": "Bad Request", "message": "principal and interest_rate must be numeric"}), 400

    if principal <= 0:
        return jsonify({"error": "Bad Request", "message": "principal must be positive"}), 400

    try:
        due_on = date.fromisoformat(data["due_on"])
    except ValueError:
        return jsonify({"error": "Bad Request", "message": "due_on must be a valid ISO date"}), 400

    is_eligible, reason = check_loan_eligibility(member, principal)
    if not is_eligible:
        return jsonify({"error": "Bad Request", "message": reason}), 400

    loan = Loan(
        group_id=group_id,
        member_id=member_id,
        principal=principal,
        interest_rate=interest_rate,
        issued_on=date.today(),
        due_on=due_on,
        status=LoanStatus.DISBURSED,
    )
    db.session.add(loan)
    db.session.commit()

    return jsonify({"message": "Loan issued successfully", "loan": _serialize_loan(loan)}), 201


# Loan detail
@loans_bp.route("/<uuid:group_id>/<uuid:loan_id>", methods=["GET"])
@jwt_required()
def get_loan(group_id, loan_id):
    """Returns a single loan with its repayment history."""
    claims = get_jwt()
    if claims.get("group_id") != str(group_id):
        return jsonify({"error": "Forbidden", "message": "Access restricted to group members"}), 403

    loan = db.session.get(Loan, loan_id)
    if not loan or loan.group_id != group_id:
        return jsonify({"error": "Not Found", "message": "Loan not found"}), 404

    if claims.get("role") != "treasurer" and str(loan.member_id) != get_jwt_identity():
        return jsonify({"error": "Forbidden", "message": "You may only view your own loans"}), 403

    payload = _serialize_loan(loan)
    payload["repayments"] = [
        {
            "id": str(r.id),
            "amount": float(r.amount),
            "mpesa_code": r.mpesa_code,
            "paid_on": r.paid_on.isoformat() if r.paid_on else None,
        }
        for r in loan.repayments
    ]

    return jsonify(payload), 200


# Record a repayment
@loans_bp.route("/<uuid:group_id>/<uuid:loan_id>/repayments", methods=["POST"])
@roles_required("treasurer")
def record_repayment(group_id, loan_id):
    """Records a repayment against a loan and auto-clears it once fully paid. Treasurer only."""
    claims = get_jwt()
    if claims.get("group_id") != str(group_id):
        return jsonify({"error": "Forbidden", "message": "Access restricted to group members"}), 403

    loan = db.session.get(Loan, loan_id)
    if not loan or loan.group_id != group_id:
        return jsonify({"error": "Not Found", "message": "Loan not found"}), 404

    if loan.status not in (LoanStatus.DISBURSED, LoanStatus.PENDING):
        return jsonify({"error": "Bad Request", "message": "Repayments can only be recorded against active loans"}), 400

    data = request.get_json() or {}
    if data.get("amount") is None:
        return jsonify({"error": "Bad Request", "message": "amount is a required field"}), 400

    try:
        amount = Decimal(str(data["amount"]))
    except InvalidOperation:
        return jsonify({"error": "Bad Request", "message": "amount must be numeric"}), 400

    if amount <= 0:
        return jsonify({"error": "Bad Request", "message": "amount must be positive"}), 400

    repayment = Repayment(
        loan_id=loan.id,
        amount=amount,
        mpesa_code=data.get("mpesa_code"),
        paid_on=datetime.now(timezone.utc),
    )
    db.session.add(repayment)
    db.session.flush()  # so loan.total_paid reflects this repayment below

    if loan.remaining_balance <= 0:
        loan.status = LoanStatus.CLEARED

    db.session.commit()

    return jsonify({
        "message": "Repayment recorded successfully",
        "loan": _serialize_loan(loan)
    }), 201