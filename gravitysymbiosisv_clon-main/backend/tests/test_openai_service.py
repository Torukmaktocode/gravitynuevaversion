"""Tests unitarios del flujo del Assistant (mocks del cliente OpenAI).

Cubre `get_assistant_knowledge` (consulta al Assistant de la empresa) y
`analyze_objection` (Closer Elite), verificando que usan el `assistant_id`
proporcionado y manejan errores sin romper.
"""

import pytest
from unittest.mock import MagicMock, patch

from services import openai_service


# ---------------------------------------------------------------------------
# get_assistant_knowledge
# ---------------------------------------------------------------------------
def test_sin_assistant_id_devuelve_mensaje_configuracion():
    result = openai_service.get_assistant_knowledge("hola")
    assert "no disponible" in result


def test_run_completado_devuelve_contenido_y_elimina_thread():
    fake_client = MagicMock()
    fake_client.beta.threads.create.return_value = MagicMock(id="thread-1")
    fake_client.beta.threads.runs.create_and_poll.return_value = MagicMock(status="completed")
    fake_client.beta.threads.messages.list.return_value = MagicMock(
        data=[MagicMock(content=[MagicMock(text=MagicMock(value="respuesta del assistant"))])]
    )

    with patch.object(openai_service, "client", fake_client):
        result = openai_service.get_assistant_knowledge("hola", assistant_id="asst_1")

    assert result == "respuesta del assistant"
    # El thread se elimina en `finally`
    fake_client.beta.threads.delete.assert_called_once_with("thread-1")


def test_run_no_completado_devuelve_error_y_elimina_thread():
    fake_client = MagicMock()
    fake_client.beta.threads.create.return_value = MagicMock(id="thread-2")
    fake_client.beta.threads.runs.create_and_poll.return_value = MagicMock(status="failed")

    with patch.object(openai_service, "client", fake_client):
        result = openai_service.get_assistant_knowledge("hola", assistant_id="asst_1")

    assert "failed" in result
    fake_client.beta.threads.delete.assert_called_once_with("thread-2")


def test_error_creando_thread_devuelve_mensaje_error():
    fake_client = MagicMock()
    fake_client.beta.threads.create.side_effect = Exception("boom")

    with patch.object(openai_service, "client", fake_client):
        result = openai_service.get_assistant_knowledge("hola", assistant_id="asst_1")

    assert "Error" in result


# ---------------------------------------------------------------------------
# analyze_objection (Closer Elite)
# ---------------------------------------------------------------------------
def test_inyecta_contexto_del_assistant_en_el_prompt():
    fake_client = MagicMock()
    fake_client.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content='{"tipo_objecion": "Precio"}'))]
    )

    with patch.object(openai_service, "client", fake_client), patch.object(
        openai_service, "get_assistant_knowledge", return_value="CONTEXTO_DE_PRUEBA"
    ):
        result = openai_service.analyze_objection("muy caro", assistant_id="asst_1")

    assert result["tipo_objecion"] == "Precio"
    prompt = fake_client.chat.completions.create.call_args.kwargs["messages"][0]["content"]
    assert "CONTEXTO_DE_PRUEBA" in prompt


def test_sin_assistant_no_consulta_knowledge():
    fake_client = MagicMock()
    fake_client.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content='{"tipo_objecion": "Tiempo"}'))]
    )

    with patch.object(openai_service, "client", fake_client), patch.object(
        openai_service, "get_assistant_knowledge"
    ) as mock_knowledge:
        openai_service.analyze_objection("lo pienso", assistant_id=None)

    mock_knowledge.assert_not_called()


def test_contenido_vacio_lanza_error():
    fake_client = MagicMock()
    fake_client.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content=None))]
    )

    with patch.object(openai_service, "client", fake_client):
        with pytest.raises(ValueError):
            openai_service.analyze_objection("muy caro", assistant_id=None)
