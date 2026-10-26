"""Tests del Assistant por empresa.

Verifica que:
1. `get_company_assistant_id` resuelve el Assistant correcto según la empresa del usuario.
2. El Entrenador (`get_system_prompt`) consulta el Assistant de la empresa (no un global).
3. El contexto del Assistant se inyecta en ambos branches (general y específico).
"""

import pytest
from unittest.mock import patch

from routes.analysis_routes import get_company_assistant_id
from services import prompt_service


class _FakeResponse:
    def __init__(self, data):
        self.data = data


class _FakeQuery:
    def __init__(self, rows):
        self._rows = rows

    def select(self, *cols):
        return self

    def eq(self, col, value):
        self._rows = [r for r in self._rows if r.get(col) == value]
        return self

    def execute(self):
        return _FakeResponse(self._rows)


class _FakeSupabase:
    def __init__(self, tables):
        self._tables = tables

    def table(self, name):
        return _FakeQuery(self._tables.get(name, []))


PROFILES = [
    {"id": "user-falabella", "company_id": "comp-falabella"},
    {"id": "user-invu", "company_id": "comp-invu"},
    {"id": "user-orphan", "company_id": None},
]

COMPANIES = [
    {"id": "comp-falabella", "openai_assistant_id": "asst_falabella"},
    {"id": "comp-invu", "openai_assistant_id": "asst_invu"},
    {"id": "comp-sin-asistente", "openai_assistant_id": None},
]


@pytest.fixture
def fake_supabase():
    return _FakeSupabase({"profiles": PROFILES, "companies": COMPANIES})


# ---------------------------------------------------------------------------
# get_company_assistant_id
# ---------------------------------------------------------------------------
def test_resuelve_assistant_segun_empresa(fake_supabase):
    with patch("routes.analysis_routes.supabase", fake_supabase):
        assert get_company_assistant_id("user-falabella") == "asst_falabella"
        assert get_company_assistant_id("user-invu") == "asst_invu"


def test_none_cuando_usuario_sin_empresa(fake_supabase):
    with patch("routes.analysis_routes.supabase", fake_supabase):
        assert get_company_assistant_id("user-orphan") is None
        assert get_company_assistant_id(None) is None


def test_none_cuando_empresa_sin_assistant():
    fake = _FakeSupabase(
        {
            "profiles": [{"id": "user-x", "company_id": "comp-sin-asistente"}],
            "companies": [{"id": "comp-sin-asistente", "openai_assistant_id": None}],
        }
    )
    with patch("routes.analysis_routes.supabase", fake):
        assert get_company_assistant_id("user-x") is None


def test_none_cuando_usuario_no_existe(fake_supabase):
    with patch("routes.analysis_routes.supabase", fake_supabase):
        assert get_company_assistant_id("user-desconocido") is None


# ---------------------------------------------------------------------------
# El Entrenador consulta el Assistant de la empresa (no un global)
# ---------------------------------------------------------------------------
def test_entrenador_consulta_assistant_empresa_en_branch_general(fake_supabase):
    calls = {}

    def _fake_get_assistant_knowledge(query, assistant_id=None):
        calls["assistant_id"] = assistant_id
        return "contexto de prueba"

    with patch("routes.analysis_routes.supabase", fake_supabase):
        assistant_id = get_company_assistant_id("user-falabella")

    with patch.object(
        prompt_service, "get_assistant_knowledge", side_effect=_fake_get_assistant_knowledge
    ):
        prompt = prompt_service.get_system_prompt(
            "Vendedor", "quiero practicar una objeción de precio", {}, assistant_id=assistant_id
        )

    assert calls["assistant_id"] == "asst_falabella"
    assert "contexto de prueba" in prompt


def test_entrenador_consulta_assistant_empresa_en_branch_especifico(fake_supabase):
    calls = {}

    def _fake_get_assistant_knowledge(query, assistant_id=None):
        calls["assistant_id"] = assistant_id
        return "contexto especifico"

    with patch("routes.analysis_routes.supabase", fake_supabase):
        assistant_id = get_company_assistant_id("user-invu")

    with patch.object(
        prompt_service, "get_assistant_knowledge", side_effect=_fake_get_assistant_knowledge
    ):
        prompt = prompt_service.get_system_prompt(
            "Vendedor", "¿cuál es la cobertura del plan 360?", {}, assistant_id=assistant_id
        )

    assert calls["assistant_id"] == "asst_invu"
    assert "contexto especifico" in prompt


def test_entrenador_sin_assistant_no_consulta():
    with patch.object(prompt_service, "get_assistant_knowledge") as mock_knowledge:
        prompt_service.get_system_prompt("Vendedor", "quiero practicar", {}, assistant_id=None)
    mock_knowledge.assert_not_called()
