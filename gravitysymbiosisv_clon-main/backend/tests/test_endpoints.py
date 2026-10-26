"""Tests de endpoints con Flask test client (sin red, con mocks de Supabase/OpenAI)."""

from unittest.mock import MagicMock, patch

from app import app
from routes import analysis_routes, knowledge_routes, training_routes


def _client():
    return app.test_client()


# ---------------------------------------------------------------------------
# Smoke
# ---------------------------------------------------------------------------
def test_health():
    resp = _client().get("/health")
    assert resp.status_code == 200
    assert resp.get_json() == {"status": "healthy"}


def test_home():
    resp = _client().get("/")
    assert resp.status_code == 200
    assert resp.get_json()["status"].startswith("Gravity")


# ---------------------------------------------------------------------------
# /entrenar
# ---------------------------------------------------------------------------
def test_entrenar_sin_auth():
    resp = _client().post("/entrenar", data={"text": "hola"})
    assert resp.status_code == 401


def test_entrenar_sin_texto_ni_audio():
    with patch.object(training_routes, "get_user_id", return_value=("user-1", "token")), patch.object(
        training_routes, "get_authenticated_client", return_value=MagicMock()
    ):
        resp = _client().post("/entrenar", data={})
    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# /analizar
# ---------------------------------------------------------------------------
def test_analizar_sin_objecion():
    resp = _client().post("/analizar", json={})
    assert resp.status_code == 400


def test_analizar_valido():
    with patch.object(
        analysis_routes, "analyze_objection", return_value={"tipo_objecion": "Precio"}
    ):
        resp = _client().post("/analizar", json={"objecion": "muy caro"})
    assert resp.status_code == 200
    assert resp.get_json()["tipo_objecion"] == "Precio"


# ---------------------------------------------------------------------------
# /conocimiento/admin
# ---------------------------------------------------------------------------
def test_conocimiento_admin_sin_auth():
    resp = _client().get("/conocimiento/admin?company_id=comp-a")
    assert resp.status_code == 401


def test_conocimiento_admin_no_es_admin():
    with patch.object(knowledge_routes, "get_user_id", return_value=("user-1", "token")), patch.object(
        knowledge_routes, "get_user_role", return_value={"role": "user", "company_id": "comp-a"}
    ):
        resp = _client().get("/conocimiento/admin?company_id=comp-a")
    assert resp.status_code == 403


def test_conocimiento_admin_sin_company_id():
    with patch.object(knowledge_routes, "get_user_id", return_value=("user-1", "token")), patch.object(
        knowledge_routes, "get_user_role", return_value={"role": "admin", "company_id": "comp-a"}
    ):
        resp = _client().get("/conocimiento/admin")
    assert resp.status_code == 400
