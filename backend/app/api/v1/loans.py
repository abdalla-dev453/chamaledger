# app/api/v1/loans.py
from datetime import datetime, timezone
from decimal import Decimal
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

from app.extensions import db
from app.models import Loan, Repayment, LoanStatus, User, Group
from app.core.decorators import roles_required

loans_bp = Blueprint("loans", __name__, url_prefix="/api/v1/loans")

# =========================
# Apply Loan
# ==================
@loans_bp.route("/apply", methods=["POST"])
@jwt_required()
def apply_loan():
    """
    Applies for a new loan.
    Calculates interest and total repayment amount automatically.
    """
    user_id = get_jwt_identity()
    claims = get_jwt()
    group_id = claims.get("group_id")

    data = request.get_json() or {}

    try:
        amount = Decimal(str(data.get("amount", 0)))
        interest_rate = Decimal(str(data.get("interest_rate", 10.0)))  # Default 10%
        duration_months = int(data.get("duration_months", 1))
    except (ValueError, TypeError):
        return jsonify({"error": "Bad Request", "message": "Invalid numeric input for loan terms."}), 400

    if amount <= 0:
        return jsonify({"error": "Bad Request", "message": "Loan amount must be greater than 0."}), 400

    # Calculate Interest & Total Due
    # Interest formula: Principal * (Rate / 100)
    interest_amount = (amount * (interest_rate / Decimal("100"))).quantize(Decimal("0.01"))
    total_amount_due = amount + interest_amount

    new_loan = Loan(
        group_id=group_id,
        member_id=user_id,
        principal_amount=amount,
        interest_rate=interest_rate,
        interest_amount=interest_amount,
        total_amount_due=total_amount_due,
        balance_remaining=total_amount_due,
        status=LoanStatus.PENDING,
        duration_months=duration_months
    )

    db.session.add(new_loan)
    db.session.commit()

    return jsonify({
        "message": "Loan application submitted successfully.",
        "loan": {
            "id": str(new_loan.id),
            "principal_amount": float(new_loan.principal_amount),
            "interest_rate": float(new_loan.interest_rate),
            "interest_amount": float(new_loan.interest_amount),
            "total_amount_due": float(new_loan.total_amount_due),
            "balance_remaining": float(new_loan.balance_remaining),
            "status": new_loan.status.value if hasattr(new_loan.status, "value") else str(new_loan.status),
            "duration_months": new_loan.duration_months
        }
    }), 201


@loans_bp.route("/<uuid:loan_id>/approve", methods=["PATCH"])
@roles_required("treasurer")
def approve_loan(loan_id):
    """Approves a pending loan (Treasurer only)."""
    claims = get_jwt()
    group_id = claims.get("group_id")

    loan = db.session.get(Loan, loan_id)
    if not loan or str(loan.group_id) != group_id:
        return jsonify({"error": "Not Found", "message": "Loan record not found."}), 404

    if loan.status != LoanStatus.PENDING:
        return jsonify({"error": "Conflict", "message": f"Cannot approve loan in status '{loan.status.value}'."}), 409

    loan.status = LoanStatus.APPROVED
    loan.approved_at = datetime.now(timezone.utc)
    db.session.commit()

    return jsonify({"message": "Loan approved successfully.", "loan_id": str(loan.id), "status": loan.status.value}), 200


@loans_bp.route("/repay", methods=["POST"])
@jwt_required()
def repay_loan():
    """
    Processes a repayment toward an active loan.
    Deducts payment from remaining balance and marks as REPAID if balance drops to 0.
    """
    data = request.get_json() or {}
    loan_id = data.get("loan_id")

    try:
        amount = Decimal(str(data.get("amount", 0)))
    except (ValueError, TypeError):
        return jsonify({"error": "Bad Request", "message": "Invalid repayment amount."}), 400

    if not loan_id or amount <= 0:
        return jsonify({"error": "Bad Request", "message": "loan_id and a positive amount are required."}), 400

    loan = db.session.get(Loan, loan_id)
    if not loan:
        return jsonify({"error": "Not Found", "message": "Loan not found."}), 404

    if loan.status not in [LoanStatus.APPROVED, LoanStatus.ACTIVE, LoanStatus.DISBURSED]:
        return jsonify({"error": "Conflict", "message": "Repayments can only be made against active/approved loans."}), 409

    if loan.balance_remaining <= 0:
        return jsonify({"message": "This loan is already fully settled."}), 200

    # Record Repayment
    repayment = Repayment(
        loan_id=loan.id,
        amount=amount,
        payment_method=data.get("payment_method", "MPESA"),
        reference_number=data.get("reference_number")
    )

    # Update Balance
    loan.balance_remaining = max(Decimal("0.00"), loan.balance_remaining - amount)

    if loan.balance_remaining == Decimal("0.00"):
        loan.status = LoanStatus.REPAID

    db.session.add(repayment)
    db.session.commit()

    return jsonify({
        "message": "Repayment recorded successfully.",
        "repayment": {
            "id": str(repayment.id),
            "amount_paid": float(amount),
            "payment_method": repayment.payment_method,
            "reference_number": repayment.reference_number
        },
        "loan_status": {
            "loan_id": str(loan.id),
            "remaining_balance": float(loan.balance_remaining),
            "status": loan.status.value if hasattr(loan.status, "value") else str(loan.status)
        }
    }), 200


@loans_bp.route("/<uuid:loan_id>", methods=["GET"])
@jwt_required()
def get_loan_detail(loan_id):
    """Fetches loan details along with full repayment history."""
    claims = get_jwt()
    group_id = claims.get("group_id")

    loan = db.session.get(Loan, loan_id)
    if not loan or str(loan.group_id) != group_id:
        return jsonify({"error": "Not Found", "message": "Loan not found."}), 404

    repayments = [
        {
            "id": str(r.id),
            "amount": float(r.amount),
            "payment_method": r.payment_method,
            "reference_number": r.reference_number,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in loan.repayments
    ]

    return jsonify({
        "id": str(loan.id),
        "member_id": str(loan.member_id),
        "principal_amount": float(loan.principal_amount),
        "interest_rate": float(loan.interest_rate),
        "interest_amount": float(loan.interest_amount),
        "total_amount_due": float(loan.total_amount_due),
        "balance_remaining": float(loan.balance_remaining),
        "status": loan.status.value if hasattr(loan.status, "value") else str(loan.status),
        "repayments": repayments
    }), 200