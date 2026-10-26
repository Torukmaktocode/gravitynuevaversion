"""Tests del clasificador de intención y del system prompt del Entrenador."""

import pytest
from unittest.mock import MagicMock, patch

from services import prompt_service
from services.prompt_service import clasificar_intencion


# ---------------------------------------------------------------------------
# clasificar_intencion
# ---------------------------------------------------------------------------
def test_clasifica_general():
    assert clasificar_intencion("quiero practicar una venta") == "general"


def test_clasifica_especifico():
    assert clasificar_intencion("cuál es la cobertura del plan 360") == "especifico"


def test_corto_sin_keywords_es_general():
    assert clasificar_intencion("hola") == "general"


def test_largo_sin_keywords_es_desconocido():
    texto = "me gustaría profundizar en las técnicas avanzadas de negociación y manejo de clientes difíciles en el sector"
    assert clasificar_intencion(texto) == "desconocido"


# ---------------------------------------------------------------------------
# get_system_prompt
# ---------------------------------------------------------------------------
def test_general_no_incluye_bloque_contexto_sin_assistant():
    with patch.object(prompt_service, "get_assistant_knowledge") as mock_knowledge:
        prompt = prompt_service.get_system_prompt(
            "Vendedor", "quiero practicar", {}, assistant_id=None
        )
    mock_knowledge.assert_not_called()
    assert "Contexto relevante" not in prompt


def test_perfil_incluye_nivel_y_bloqueos():
    perfil = {"training_level": "Leyenda", "blockages": "Miedo al precio"}
    with patch.object(prompt_service, "get_assistant_knowledge") as mock_knowledge:
        prompt = prompt_service.get_system_prompt(
            "Vendedor", "quiero practicar", perfil, assistant_id=None
        )
    assert "Leyenda" in prompt
    assert "Miedo al precio" in prompt
    mock_knowledge.assert_not_called()


# ---------------------------------------------------------------------------
# generar_plan_entrenamiento
# ---------------------------------------------------------------------------
def test_generar_plan_devuelve_json():
    fake_client = MagicMock()
    fake_client.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content='{"level": "Arquitecto"}'))]
    )

    with patch.object(prompt_service, "client", fake_client):
        plan = prompt_service.generar_plan_entrenamiento({}, "30 minutos")

    assert plan["level"] == "Arquitecto"


def test_generar_plan_contenido_vacio_lanza_error():
    fake_client = MagicMock()
    fake_client.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content=None), finish_reason="stop")]
    )

    with patch.object(prompt_service, "client", fake_client):
        with pytest.raises(ValueError):
            prompt_service.generar_plan_entrenamiento({}, "30 minutos")
