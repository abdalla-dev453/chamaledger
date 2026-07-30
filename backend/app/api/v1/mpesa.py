# app/api/v1/mpesa.py
import io
import pandas as pd
from datetime import datetime, timezone
from decimal import Decimal
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt

from app.extensions import db
from app.models import MpesaStatement, Contribution, User, Cycle, ContributionStatus
from app.core.utils import normalize_kenyan_phone
from app.core.decorators import roles_required

mpesa_bp = Blueprint("mpesa", __name__, url_prefix="/api/v1/mpesa")


@mpesa_bp.route("/upload-statement", methods=["POST"])
@roles_required("treasurer")
def upload_statement():
    """
    Parses uploaded M-Pesa CSV or Excel statements and stores raw transactions.
    """
    claims = get_jwt()
    group_id = claims.get("group_id")

    if "file" not in request.files:
        return jsonify({"error": "Bad Request", "message": "No statement file uploaded."}), 400

    file = request.files["file"]
    filename = file.filename.lower()

    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(file)
        elif filename.endswith((".xls", ".xlsx")):
            df = pd.read_excel(file)
        else:
            return jsonify({"error": "Bad Request", "message": "Only CSV or Excel files (.xls, .xlsx) supported."}), 400
    except Exception as e:
        return jsonify({"error": "Bad Request", "message": f"Error reading file: {str(e)}"}), 400

    # Flexible column mapping for standard Safaricom C2B statement exports
    column_mapping = {
        "Receipt No.": "transaction_code",
        "Transaction Code": "transaction_code",
        "Completion Time": "transaction_date",
        "Transaction Date": "transaction_date",
        "Amount": "amount",
        "Paid In": "amount",
        "Other Party Info": "sender_info",
        "Details": "sender_info",
        "MSISDN": "phone_number",
        "Phone": "phone_number"
    }

    df = df.rename(columns={c: column_mapping[c] for c in df.columns if c in column_mapping})

    required_cols = {"transaction_code", "amount"}
    if not required_cols.issubset(set(df.columns)):
        return jsonify({
            "error": "Unprocessable Entity",
            "message": "Missing required columns in statement. File must contain Receipt No./Transaction Code and Amount."
        }), 422

    imported_count = 0
    duplicate_count = 0

    for _, row in df.iterrows():
        tx_code = str(row.get("transaction_code", "")).strip()
        if not tx_code or pd.isna(tx_code) or tx_code == "nan":
            continue

        # Skip already ingested transactions
        existing = MpesaStatement.query.filter_by(transaction_code=tx_code).first()
        if existing:
            duplicate_count += 1
            continue

        # Amount parsing
        try:
            raw_amt = str(row.get("amount", "0")).replace(",", "").strip()
            amount = Decimal(raw_amt)
        except Exception:
            continue

        # Extract phone and sender name from M-Pesa raw text string if combined
        sender_info = str(row.get("sender_info", ""))
        phone = normalize_kenyan_phone(str(row.get("phone_number", "")))
        
        if not phone and sender_info:
            # Fallback parsing for Safaricom "254712345678 - JOHN DOE" format
            parts = sender_info.split("-")
            if len(parts) >= 1:
                phone = normalize_kenyan_phone(parts[0].strip())

        stmt = MpesaStatement(
            group_id=group_id,
            transaction_code=tx_code,
            amount=amount,
            phone_number=phone,
            sender_name=sender_info,
            is_matched=False
        )
        db.session.add(stmt)
        imported_count += 1

    db.session.commit()

    return jsonify({
        "message": f"M-Pesa statement processed.",
        "imported_records": imported_count,
        "duplicates_skipped": duplicate_count
    }), 201


@mpesa_bp.route("/auto-match", methods=["POST"])
@roles_required("treasurer")
def auto_match_contributions():
    """
    Auto-matches unassigned M-Pesa transactions to active cycle contributions.
    Matching heuristic:
    1. Phone number matches a group User.
    2. Maps transaction to specified cycle_id (or active cycle).
    """
    claims = get_jwt()
    group_id = claims.get("group_id")
    data = request.get_json() or {}

    cycle_id = data.get("cycle_id")
    if not cycle_id:
        active_cycle = Cycle.query.filter_by(group_id=group_id, is_closed=False).first()
        if not active_cycle:
            return jsonify({"error": "Not Found", "message": "No active contribution cycle found."}), 404
        cycle_id = active_cycle.id

    cycle = db.session.get(Cycle, cycle_id)

    # Fetch all unmatched M-Pesa statements for this group
    unmatched_statements = MpesaStatement.query.filter_by(group_id=group_id, is_matched=False).all()
    
    # Pre-fetch active members mapped by normalized phone
    members = User.query.filter_by(group_id=group_id, is_active=True).all()
    member_phone_map = {m.phone_number: m for m in members if m.phone_number}

    matched_count = 0
    matched_details = []

    for stmt in unmatched_statements:
        matched_user = member_phone_map.get(stmt.phone_number)
        
        if matched_user:
            # Check or create contribution record for this cycle
            contrib = Contribution.query.filter_by(cycle_id=cycle.id, member_id=matched_user.id).first()

            if not contrib:
                contrib = Contribution(
                    group_id=group_id,
                    cycle_id=cycle.id,
                    member_id=matched_user.id,
                    amount_paid=stmt.amount,
                    status=ContributionStatus.PAID if stmt.amount >= cycle.expected_amount_per_member else ContributionStatus.PARTIAL
                )
                db.session.add(contrib)
                db.session.flush() # Generate contrib.id
            else:
                contrib.amount_paid += stmt.amount
                if contrib.amount_paid >= cycle.expected_amount_per_member:
                    contrib.status = ContributionStatus.PAID
                else:
                    contrib.status = ContributionStatus.PARTIAL

            # Mark M-Pesa transaction as matched
            stmt.is_matched = True
            stmt.contribution_id = contrib.id

            matched_count += 1
            matched_details.append({
                "transaction_code": stmt.transaction_code,
                "amount": float(stmt.amount),
                "member_name": matched_user.full_name,
                "phone_number": stmt.phone_number
            })

    db.session.commit()

    return jsonify({
        "message": f"Auto-matching complete.",
        "total_matched": matched_count,
        "matches": matched_details
    }), 200