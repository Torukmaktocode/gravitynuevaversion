import re

_HALLUCINATION_MARKERS = ("amara.org", "subtítulos", "subtitulos")
_GRATITUDE_MARKERS = ("gracias.", "gracias por ver")

_TTS_FIXES = {
    "CEO": "Director Ejecutivo",
    "ROI": "retorno de inversión",
    "leads": "prospectos",
    "feedback": "retroalimentación",
    "follow up": "seguimiento",
    "follow-up": "seguimiento",
    "OK": "entendido",
    "Okay": "entendido",
}


def is_hallucination(text: str) -> bool:
    clean = (text or "").strip().lower()

    if len(clean) < 2:
        return True

    if any(marker in clean for marker in _HALLUCINATION_MARKERS):
        return True

    if len(clean) < 25 and any(marker in clean for marker in _GRATITUDE_MARKERS):
        return True

    return False


def apply_tts_fixes(text: str) -> str:
    result = text or ""
    for eng, esp in _TTS_FIXES.items():
        result = re.sub(re.escape(eng), esp, result, flags=re.IGNORECASE)
    return result
