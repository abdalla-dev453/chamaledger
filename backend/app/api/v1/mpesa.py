# app/api/v1/mpesa.py
import io
import pandas as pd
from datetime import datetime, timezone
from decimal import Decimal
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

from app.extensions import db
from app.models import MpesaStatement, Contribution, User, Cycle, ContributionStatus
from app.core.utils import normalize_kenyan_phone
from app.core.decorators import roles_required
import os
import base64
import requests
import json
from app.models import MpesaTransaction, Loan, Repayment, LoanStatus, ContributionMethod
from flask import current_app

# Simple in-memory token cache
_oauth_cache = {"token": None, "expires_at": None}


def _get_mpesa_oauth_token():
    """Retrieve Daraja OAuth token (cached)."""
    now = datetime.now(timezone.utc).timestamp()
    if _oauth_cache.get("token") and _oauth_cache.get("expires_at", 0) > now + 5:
        return _oauth_cache["token"]

    key = os.getenv("MPESA_CONSUMER_KEY")
    secret = os.getenv("MPESA_CONSUMER_SECRET")
    env = os.getenv("MPESA_ENV", "sandbox")
    if not key or not secret:
        raise RuntimeError("MPESA credentials not configured")

    host = "https://sandbox.safaricom.co.ke" if env == "sandbox" else "https://api.safaricom.co.ke"
    url = f"{host}/oauth/v1/generate?grant_type=client_credentials"
    resp = requests.get(url, auth=(key, secret), timeout=10)
    resp.raise_for_status()
    data = resp.json()
    token = data.get("access_token")
    expires_in = int(data.get("expires_in", 3600))
    _oauth_cache["token"] = token
    _oauth_cache["expires_at"] = datetime.now(timezone.utc).timestamp() + expires_in
    return token


def _lipa_na_mpesa_stk_push(
    phone,
    amount,
    account_ref,
    description,
    callback_url,
    group_id,
    member_id=None,
    purpose=None,
    target_id=None,
):
    env = os.getenv("MPESA_ENV", "sandbox")
    host = "https://sandbox.safaricom.co.ke" if env == "sandbox" else "https://api.safaricom.co.ke"
    shortcode = os.getenv("MPESA_SHORTCODE")
    passkey = os.getenv("MPESA_PASSKEY")
    if not shortcode or not passkey:
        raise RuntimeError("MPESA shortcode/passkey not configured")

    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode()

    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),
        "PartyA": phone,
        "PartyB": shortcode,
        "PhoneNumber": phone,
        "CallBackURL": callback_url,
        "AccountReference": account_ref,
        "TransactionDesc": description,
    }

    token = _get_mpesa_oauth_token()
    url = f"{host}/mpesa/stkpush/v1/processrequest"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    resp = requests.post(url, headers=headers, json=payload, timeout=15)
    resp.raise_for_status()
    return resp.json()


@mpesa_bp.route("/stkpush", methods=["POST"])
@jwt_required()
def initiate_stk_push():
    """Initiate an STK Push for a payment (members or treasurer)."""
    claims = get_jwt()
    group_id = claims.get("group_id")
    body = request.get_json() or {}
    amount = body.get("amount")
    phone = body.get("phone")
    purpose = body.get("purpose")  # 'contribution' | 'repayment'
    target_id = body.get("target_id")

    if not amount:
        return jsonify({"error": "Bad Request", "message": "amount is required"}), 400

    # derive phone from caller if not provided
    caller_id = get_jwt_identity()
    member = None
    if not phone and caller_id:
        member = User.query.filter_by(id=caller_id).first()
        phone = member.phone_number if member else None

    if not phone:
        return (
            jsonify(
                {
                    "error": "Bad Request",
                    "message": "phone is required or available on caller profile",
                }
            ),
            400,
        )

    # build callback URL from env
    callback_url = os.getenv("MPESA_CALLBACK_URL")
    if not callback_url:
        # fallback to application config if present
        callback_url = current_app.config.get("MPESA_CALLBACK_URL")
    if not callback_url:
        return (
            jsonify({"error": "Server Error", "message": "MPESA callback URL not configured"}),
            500,
        )

    try:
        resp = _lipa_na_mpesa_stk_push(
            phone=phone,
            amount=amount,
            account_ref=str(group_id),
            description="Chama payment",
            callback_url=callback_url,
            group_id=group_id,
            member_id=member.id if member else None,
            purpose=purpose,
            target_id=target_id,
        )
    except Exception as e:
        return jsonify({"error": "Bad Gateway", "message": str(e)}), 502

    # Response contains MerchantRequestID and CheckoutRequestID
    merchant_id = resp.get("MerchantRequestID")
    checkout_id = resp.get("CheckoutRequestID")

    tx = MpesaTransaction(
        group_id=group_id,
        member_id=member.id if member else None,
        amount=amount,
        phone_number=phone,
        checkout_request_id=checkout_id,
        merchant_request_id=merchant_id,
        status="PENDING",
        purpose=purpose,
        target_id=target_id,
    )
    db.session.add(tx)
    db.session.commit()

    return (
        jsonify(
            {
                "merchant_request_id": merchant_id,
                "checkout_request_id": checkout_id,
                "transaction_id": str(tx.id),
            }
        ),
        200,
    )


@mpesa_bp.route("/callback", methods=["POST"])
def daraja_callback():
    """Daraja STK push callback receiver.
    This endpoint is public (Safaricom will call it). It must be idempotent.
    """
    data = request.get_json() or {}
    try:
        body = data.get("Body", {})
        stk = body.get("stkCallback")
        if not stk:
            return jsonify({"message": "ignored"}), 200

        checkout_id = stk.get("CheckoutRequestID")
        merchant_id = stk.get("MerchantRequestID")
        result_code = stk.get("ResultCode")
        result_desc = stk.get("ResultDesc")

        tx = None
        if checkout_id:
            tx = MpesaTransaction.query.filter_by(checkout_request_id=checkout_id).first()
        if not tx and merchant_id:
            tx = MpesaTransaction.query.filter_by(merchant_request_id=merchant_id).first()

        # If no known transaction, store minimal audit (skip)
        if not tx:
            return jsonify({"message": "unknown transaction"}), 200

        # If already processed, return quickly (idempotency)
        if tx.status == "SUCCESS":
            return jsonify({"message": "already processed"}), 200

        if result_code == 0:
            # parse CallbackMetadata
            metadata = stk.get("CallbackMetadata", {}).get("Item", [])
            receipt = None
            amount = None
            phone = None
            for item in metadata:
                name = item.get("Name")
                value = item.get("Value")
                if name == "MpesaReceiptNumber":
                    receipt = value
                if name == "Amount":
                    amount = value
                if name == "PhoneNumber":
                    phone = value

            tx.mark_success(receipt, phone=phone, amount=amount)

            # Create corresponding domain records depending on purpose
            if tx.purpose == "contribution" and tx.target_id:
                # create a Contribution for the target cycle if not exists for this member
                cycle = db.session.get(Cycle, tx.target_id)
                if cycle:
                    existing = Contribution.query.filter_by(
                        cycle_id=cycle.id, member_id=tx.member_id
                    ).first()
                    if not existing:
                        # mark as confirmed for now; treasurer can adjust if needed
                        contribution = Contribution(
                            group_id=tx.group_id,
                            cycle_id=cycle.id,
                            member_id=tx.member_id,
                            amount=Decimal(str(amount)) if amount is not None else tx.amount,
                            method=ContributionMethod.MPESA,
                            mpesa_code=receipt,
                            paid_on=datetime.now(timezone.utc),
                            status=ContributionStatus.CONFIRMED,
                        )
                        db.session.add(contribution)
            if tx.purpose == "repayment" and tx.target_id:
                loan = db.session.get(Loan, tx.target_id)
                if loan:
                    # create a Repayment record
                    repayment = Repayment(
                        loan_id=loan.id,
                        amount=amount,
                        mpesa_code=receipt,
                        paid_on=datetime.now(timezone.utc),
                    )
                    db.session.add(repayment)
                    db.session.flush()
                    if loan.remaining_balance <= 0:
                        loan.status = LoanStatus.CLEARED

        else:
            tx.status = "FAILED"

        db.session.commit()
    except Exception as exc:
        current_app.logger.exception("Error handling daraja callback: %s", exc)
        return jsonify({"error": "server error"}), 500

    return jsonify({"message": "ok"}), 200


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
            return (
                jsonify(
                    {
                        "error": "Bad Request",
                        "message": "Only CSV or Excel files (.xls, .xlsx) supported.",
                    }
                ),
                400,
            )
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
        "Phone": "phone_number",
    }

    df = df.rename(columns={c: column_mapping[c] for c in df.columns if c in column_mapping})

    required_cols = {"transaction_code", "amount"}
    if not required_cols.issubset(set(df.columns)):
        return (
            jsonify(
                {
                    "error": "Unprocessable Entity",
                    "message": (
                        "Missing required columns in statement. File must contain Receipt No./Transaction Code and Amount."
                    ),
                }
            ),
            422,
        )

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
            is_matched=False,
        )
        db.session.add(stmt)
        imported_count += 1

    db.session.commit()

    return (
        jsonify(
            {
                "message": f"M-Pesa statement processed.",
                "imported_records": imported_count,
                "duplicates_skipped": duplicate_count,
            }
        ),
        201,
    )


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
            return (
                jsonify({"error": "Not Found", "message": "No active contribution cycle found."}),
                404,
            )
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
            contrib = Contribution.query.filter_by(
                cycle_id=cycle.id, member_id=matched_user.id
            ).first()

            if not contrib:
                contrib = Contribution(
                    group_id=group_id,
                    cycle_id=cycle.id,
                    member_id=matched_user.id,
                    amount_paid=stmt.amount,
                    status=(
                        ContributionStatus.PAID
                        if stmt.amount >= cycle.expected_amount_per_member
                        else ContributionStatus.PARTIAL
                    ),
                )
                db.session.add(contrib)
                db.session.flush()  # Generate contrib.id
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
            matched_details.append(
                {
                    "transaction_code": stmt.transaction_code,
                    "amount": float(stmt.amount),
                    "member_name": matched_user.full_name,
                    "phone_number": stmt.phone_number,
                }
            )

    db.session.commit()

    return (
        jsonify(
            {
                "message": f"Auto-matching complete.",
                "total_matched": matched_count,
                "matches": matched_details,
            }
        ),
        200,
    )
