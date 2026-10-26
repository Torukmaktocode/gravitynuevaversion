"""Tests de los helpers de autenticación en core.config."""

from unittest.mock import MagicMock, patch

from core import config


class _FakeRequest:
    def __init__(self, authorization=None):
        self.headers = {}
        if authorization:
            self.headers["Authorization"] = authorization


# ---------------------------------------------------------------------------
# get_user_id
# ---------------------------------------------------------------------------
def test_get_user_id_con_token_valido():
    fake_supabase = MagicMock()
    fake_supabase.auth.get_user.return_value = MagicMock(user=MagicMock(id="user-1"))

    req = _FakeRequest("Bearer token-123")
    with patch.object(config, "supabase", fake_supabase):
        user_id, token = config.get_user_id(req)

    assert user_id == "user-1"
    assert token == "token-123"


def test_get_user_id_sin_header():
    req = _FakeRequest()
    with patch.object(config, "supabase", MagicMock()):
        user_id, token = config.get_user_id(req)

    assert user_id is None
    assert token is None


def test_get_user_id_token_invalido():
    fake_supabase = MagicMock()
    fake_supabase.auth.get_user.side_effect = Exception("token inválido")

    req = _FakeRequest("Bearer bad-token")
    with patch.object(config, "supabase", fake_supabase):
        user_id, token = config.get_user_id(req)

    assert user_id is None
    assert token == "bad-token"


# ---------------------------------------------------------------------------
# get_user_role
# ---------------------------------------------------------------------------
def test_get_user_role_admin():
    fake = MagicMock()
    fake.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"role": "admin", "company_id": "comp-a"}
    ]

    assert config.get_user_role("user-1", supabase_client=fake) == {
        "role": "admin",
        "company_id": "comp-a",
    }


def test_get_user_role_sin_perfil():
    fake = MagicMock()
    fake.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    assert config.get_user_role("user-x", supabase_client=fake) == {
        "role": None,
        "company_id": None,
    }


def test_get_user_role_error_devuelve_default():
    fake = MagicMock()
    fake.table.return_value.select.return_value.eq.return_value.execute.side_effect = Exception(
        "boom"
    )

    assert config.get_user_role("user-x", supabase_client=fake) == {
        "role": None,
        "company_id": None,
    }
