"""Pydantic schemas cho module Auth."""
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: str = Field(..., description="Email hoặc user_name", examples=["admin@example.com"])
    password: str = Field(..., examples=["password"])


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    password_confirmation: str
    token: str


class SwitchOrganizationRequest(BaseModel):
    organization_id: int


class OrganizationBrief(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class UserBrief(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}
