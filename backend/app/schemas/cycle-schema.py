# app/schemas/cycle_schema.py
"""
Pydantic request/response schemas mirroring the validation currently done by
hand in app.api.v1.cycles. Not yet wired into the routes -- kept here as the
documented contract for when that validation is centralized.

Renamed from the original cycle-schema.py: hyphens aren't valid in Python
module paths, so `from app.schemas.cycle-schema import ...` could never work.
"""
from datetime import date
from pydantic import BaseModel, model_validator


class CycleCreateSchema(BaseModel):
    period_start: date
    period_end: date

    @model_validator(mode="after")
    def validate_period(self):
        if self.period_end < self.period_start:
            raise ValueError("period_end cannot be before period_start")
        return self


class CycleResponseSchema(BaseModel):
    id: str
    period_start: date
    period_end: date
    status: str