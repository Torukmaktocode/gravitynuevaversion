"""Tests de las utilidades de texto (filtro de alucinación de Whisper y TTS)."""

from services.text_processing import apply_tts_fixes, is_hallucination


# ---------------------------------------------------------------------------
# is_hallucination
# ---------------------------------------------------------------------------
def test_vacio_es_alucinacion():
    assert is_hallucination("") is True


def test_un_caracter_es_alucinacion():
    assert is_hallucination("a") is True


def test_texto_normal_no_es_alucinacion():
    assert is_hallucination("hola") is False


def test_marca_amara_es_alucinacion():
    assert is_hallucination("síguenos en amara.org para más") is True


def test_subtitulos_es_alucinacion():
    assert is_hallucination("subtítulos") is True
    assert is_hallucination("subtitulos") is True


def test_gracias_por_ver_corto_es_alucinacion():
    assert is_hallucination("gracias por ver") is True


def test_gracias_punto_corto_es_alucinacion():
    assert is_hallucination("gracias.") is True


def test_frase_larga_con_gracias_no_es_alucinacion():
    texto = "gracias por ver este increíble video sobre técnicas de ventas y negociación"
    assert is_hallucination(texto) is False


# ---------------------------------------------------------------------------
# apply_tts_fixes
# ---------------------------------------------------------------------------
def test_reemplaza_ceo_case_insensitive():
    assert apply_tts_fixes("El CEO de la empresa") == "El Director Ejecutivo de la empresa"
    assert apply_tts_fixes("ceo") == "Director Ejecutivo"


def test_reemplaza_roi_y_leads():
    assert apply_tts_fixes("ROI y leads") == "retorno de inversión y prospectos"


def test_reemplaza_follow_up():
    assert apply_tts_fixes("haz un follow up") == "haz un seguimiento"
    assert apply_tts_fixes("follow-up") == "seguimiento"


def test_reemplaza_ok():
    assert apply_tts_fixes("ok") == "entendido"


def test_texto_sin_terminos_no_cambia():
    assert apply_tts_fixes("vamos a cerrar la venta") == "vamos a cerrar la venta"
