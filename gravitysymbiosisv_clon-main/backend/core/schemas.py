from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
import uuid


class RegisterRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def email_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Email no puede estar vacío")
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 6:
            raise ValueError("La contraseña debe tener al menos 6 caracteres")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class AnalyzeRequest(BaseModel):
    objecion: str

    @field_validator("objecion")
    @classmethod
    def not_empty(cls, v):
        if not v.strip():
            raise ValueError("Objeción no puede estar vacía")
        return v.strip()


class CopilotAnalyzeRequest(BaseModel):
    context: str = ""
    user_input: str = ""


class CreateCompanyRequest(BaseModel):
    name: str
    slug: str
    logo_url: Optional[str] = None
    settings: Optional[dict] = {}


class UpdateCompanyRequest(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    settings: Optional[dict] = None
    is_active: Optional[bool] = None


class AssignAdminRequest(BaseModel):
    user_id: str

    @field_validator("user_id")
    @classmethod
    def valid_uuid(cls, v):
        try:
            uuid.UUID(v)
        except ValueError:
            raise ValueError("user_id debe ser un UUID válido")
        return v


class CreateInvitationRequest(BaseModel):
    email: str
    role: str = "user"

    @field_validator("role")
    @classmethod
    def valid_role(cls, v):
        if v not in ("user", "admin"):
            raise ValueError("role debe ser 'user' o 'admin'")
        return v


class AcceptInvitationRequest(BaseModel):
    token: str


class GeneratePlanRequest(BaseModel):
    vendedor_info: Optional[dict] = {}
    training_time: Optional[str] = None
