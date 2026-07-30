# app/schemas/user_schema.py
"""
Pydantic request/response schemas mirroring the validation currently done by
hand in app.api.v1.auth. Not yet wired into the routes -- kept here as the
documented contract for when that validation is centralized.
"""
from pydantic import BaseModel, Field, field_validator
from app.core.utils import normalize_kenyan_phone


class UserRegisterSchema(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    phone_number: str
    password: str = Field(min_length=8)
    group_id: str | None = None
    group_name: str | None = None
    contribution_amount: float | None = None
    cycle_frequency: str | None = None

    @field_validator("phone_number")
    @classmethod
    def normalize_phone(cls, value):
        normalized = normalize_kenyan_phone(value)
        if not normalized.startswith("+254"):
            raise ValueError("phone_number must be a valid Kenyan number")
        return normalized


class UserLoginSchema(BaseModel):
    phone_number: str
    password: str

    @field_validator("phone_number")
    @classmethod
    def normalize_phone(cls, value):
        return normalize_kenyan_phone(value)


class UserResponseSchema(BaseModel):
    id: str
    group_id: str
    full_name: str
    phone_number: str
    role: str