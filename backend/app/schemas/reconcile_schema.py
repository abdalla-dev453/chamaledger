# app/schemas/reconcile_schema.py
"""
Pydantic response schema mirroring the reconciliation summary currently
returned by hand in app.api.v1.reconcile. Not yet wired into the routes --
kept here as the documented contract for when that validation is centralized.
"""
from pydantic import BaseModel


class ReconcileResultSchema(BaseModel):
    rows_imported: int
    rows_skipped_as_duplicates: int
    exact: int
    ambiguous: int
    unmatched: int
    unmatched_statement_ids: list[str] = []