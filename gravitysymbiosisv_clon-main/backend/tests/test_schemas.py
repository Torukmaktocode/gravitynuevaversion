import pytest
from pydantic import ValidationError
from core.schemas import (
    RegisterRequest, LoginRequest, AnalyzeRequest,
    CreateCompanyRequest, AssignAdminRequest,
    CreateInvitationRequest, AcceptInvitationRequest,
    GeneratePlanRequest, CopilotAnalyzeRequest,
)


class TestRegisterRequest:
    def test_valid(self):
        data = RegisterRequest(email="test@example.com", password="123456")
        assert data.email == "test@example.com"

    def test_empty_email(self):
        with pytest.raises(ValidationError):
            RegisterRequest(email="", password="123456")

    def test_short_password(self):
        with pytest.raises(ValidationError):
            RegisterRequest(email="test@example.com", password="12345")

    def test_lowercases_email(self):
        data = RegisterRequest(email="Test@Example.COM", password="123456")
        assert data.email == "test@example.com"


class TestLoginRequest:
    def test_valid(self):
        data = LoginRequest(email="test@example.com", password="123456")
        assert data.email == "test@example.com"


class TestAnalyzeRequest:
    def test_valid(self):
        data = AnalyzeRequest(objecion="El precio es muy alto")
        assert data.objecion == "El precio es muy alto"

    def test_empty_objection(self):
        with pytest.raises(ValidationError):
            AnalyzeRequest(objecion="")

    def test_whitespace_objection(self):
        with pytest.raises(ValidationError):
            AnalyzeRequest(objecion="   ")


class TestCopilotAnalyzeRequest:
    def test_defaults(self):
        data = CopilotAnalyzeRequest()
        assert data.context == ""
        assert data.user_input == ""

    def test_with_values(self):
        data = CopilotAnalyzeRequest(context="Hola", user_input="Qué hago")
        assert data.context == "Hola"
        assert data.user_input == "Qué hago"


class TestCreateCompanyRequest:
    def test_valid(self):
        data = CreateCompanyRequest(name="Test", slug="test")
        assert data.name == "Test"
        assert data.slug == "test"


class TestAssignAdminRequest:
    def test_valid_uuid(self):
        data = AssignAdminRequest(user_id="550e8400-e29b-41d4-a716-446655440000")
        assert data.user_id == "550e8400-e29b-41d4-a716-446655440000"

    def test_invalid_uuid(self):
        with pytest.raises(ValidationError):
            AssignAdminRequest(user_id="not-a-uuid")


class TestCreateInvitationRequest:
    def test_valid_user(self):
        data = CreateInvitationRequest(email="test@example.com", role="user")
        assert data.role == "user"

    def test_valid_admin(self):
        data = CreateInvitationRequest(email="admin@example.com", role="admin")
        assert data.role == "admin"

    def test_invalid_role(self):
        with pytest.raises(ValidationError):
            CreateInvitationRequest(email="test@example.com", role="super_admin")


class TestAcceptInvitationRequest:
    def test_valid(self):
        data = AcceptInvitationRequest(token="abc-123")
        assert data.token == "abc-123"


class TestGeneratePlanRequest:
    def test_defaults(self):
        data = GeneratePlanRequest()
        assert data.vendedor_info == {}
        assert data.training_time is None

    def test_with_values(self):
        data = GeneratePlanRequest(vendedor_info={"nombre": "Test"}, training_time="30 minutos")
        assert data.vendedor_info["nombre"] == "Test"
        assert data.training_time == "30 minutos"
