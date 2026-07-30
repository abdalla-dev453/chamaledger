# app/api/v1/reconcile.py
import csv
import io
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt
from app.extensions import db
from app.models import Cycle, MpesaStatement
from app.core.decorators import roles_required
from app.core.utils import normalize_kenyan_phone
from app.services.reconcile_engine import reconcile_cycle

reconcile_bp = Blueprint("reconcile", __name__, url_prefix="/api/v1/reconcile")

# Expected M-Pesa statement CSV columns, per the "raw_row" shape used in seed.py
REQUIRED_CSV_COLUMNS = {"Receipt No.", "Completion Time", "Paid In"}


# Upload an M-Pesa statement CSV and reconcile it against a cycle
@reconcile_bp.route("/<uuid:group_id>/<uuid:cycle_id>/upload", methods=["POST"])
@roles_required("treasurer")
def upload_statement(group_id, cycle_id):
    """
    Accepts an M-Pesa statement CSV export, stores each row, and attempts to
    automatically match it against the cycle's members. Treasurer only.
    """
    claims = get_jwt()
    if claims.get("group_id") != str(group_id):
        return jsonify({"error": "Forbidden", "message": "Access restricted to group members"}), 403

    cycle = db.session.get(Cycle, cycle_id)
    if not cycle or cycle.group_id != group_id:
        return jsonify({"error": "Not Found", "message": "Cycle not found"}), 404

    if "file" not in request.files:
        return jsonify({"error": "Bad Request", "message": "A CSV file is required under the 'file' field"}), 400

    upload = request.files["file"]

    try:
        reader = csv.DictReader(io.StringIO(upload.read().decode("utf-8-sig")))
    except UnicodeDecodeError:
        return jsonify({"error": "Bad Request", "message": "File must be UTF-8 encoded CSV"}), 400

    if not reader.fieldnames or not REQUIRED_CSV_COLUMNS.issubset(set(reader.fieldnames)):
        return jsonify({
            "error": "Bad Request",
            "message": f"CSV must include columns: {', '.join(sorted(REQUIRED_CSV_COLUMNS))}"
        }), 400

    new_statements = []
    skipped_duplicates = 0

    for row in reader:
        mpesa_code = row.get("Receipt No.", "").strip()
        paid_in = row.get("Paid In", "0").replace(",", "").strip()

        if not mpesa_code or not paid_in:
            continue

        already_exists = MpesaStatement.query.filter_by(group_id=group_id, mpesa_code=mpesa_code).first()
        if already_exists:
            skipped_duplicates += 1
            continue

        try:
            transaction_date = datetime.strptime(row["Completion Time"], "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
            amount = float(paid_in)
        except (ValueError, KeyError):
            continue

        statement = MpesaStatement(
            group_id=group_id,
            mpesa_code=mpesa_code,
            transaction_date=transaction_date,
            amount=amount,
            sender_phone=normalize_kenyan_phone(row.get("Sender Phone", "")) or None,
            sender_name=row.get("Details") or None,
            raw_row=row,
        )
        db.session.add(statement)
        new_statements.append(statement)

    db.session.flush()  # assign IDs before matching
    match_results = reconcile_cycle(cycle, new_statements)

    return jsonify({
        "message": "Statement uploaded and reconciled",
        "rows_imported": len(new_statements),
        "rows_skipped_as_duplicates": skipped_duplicates,
        "matches": match_results,
    }), 201


# List unreconciled statements for a group
@reconcile_bp.route("/<uuid:group_id>/unmatched", methods=["GET"])
@roles_required("treasurer")
def list_unmatched_statements(group_id):
    """Returns M-Pesa statement rows that have not yet been linked to a contribution. Treasurer only."""
    claims = get_jwt()
    if claims.get("group_id") != str(group_id):
        return jsonify({"error": "Forbidden", "message": "Access restricted to group members"}), 403

    statements = (
        MpesaStatement.query
        .filter_by(group_id=group_id)
        .filter(MpesaStatement.contribution == None)  # noqa: E711 - SQLAlchemy relationship comparison
        .order_by(MpesaStatement.transaction_date.desc())
        .all()
    )

    return jsonify({
        "unmatched_statements": [
            {
                "id": str(s.id),
                "mpesa_code": s.mpesa_code,
                "transaction_date": s.transaction_date.isoformat(),
                "amount": float(s.amount),
                "sender_phone": s.sender_phone,
                "sender_name": s.sender_name,
            }
            for s in statements
        ]
    }), 200