import json
import logging
from flask import Blueprint, request, jsonify
from core.config import client, get_user_id, supabase, openai_model
from core.rate_limit import limiter
from core.schemas import AnalyzeRequest, CopilotAnalyzeRequest
from services.openai_service import analyze_objection
from pydantic import ValidationError

logger = logging.getLogger(__name__)

def get_company_assistant_id(user_id):
    if not user_id:
        return None
    try:
        prof_resp = supabase.table("profiles").select("company_id").eq("id", user_id).execute()
        if not prof_resp.data or not prof_resp.data[0].get("company_id"):
            return None
        company_id = prof_resp.data[0]["company_id"]

        comp_resp = supabase.table("companies").select("openai_assistant_id").eq("id", company_id).execute()
        if comp_resp.data and comp_resp.data[0].get("openai_assistant_id"):
            return comp_resp.data[0]["openai_assistant_id"]
    except Exception as e:
        logger.error(f"Error getting company assistant ID: {e}")
    return None

analysis_bp = Blueprint('analysis', __name__)

@analysis_bp.route("/copilot_analyze", methods=["POST"])
@limiter.limit("20 per minute, 200 per hour")
def copilot_analyze():
    try:
        data = CopilotAnalyzeRequest(**request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    try:
        prompt = f"""
        Eres **SHADOW**, el asistente táctico de **GRAVITY SYMBIOSIS™ 2.0**.
        Estás escuchando una reunión de ventas en vivo. Tu objetivo es dar sugerencias CORTAS, AGRESIVAS y TÁCTICAS para ganar la negociación.

        ---
        ### 🎙️ ÚLTIMO CONTEXTO ESCUCHADO:
        "{data.context}"
        
        ### 👤 DUDA DEL USUARIO (Si existe):
        "{data.user_input}"
        ---

        INSTRUCCIONES:
        1. Devuelve un JSON con un array "suggestions". Cada sugerencia debe tener:
           - "type": "TACTIC" (Movimiento estratégico), "OBJECTION" (Cómo responder a algo dicho), "MINDSET" (Tonalidad)
           - "title": Título corto (3-5 palabras)
           - "content": La sugerencia exacta (máximo 2 frases)
           - "urgency": "high", "medium", "low"
        2. Basa tus consejos en Jordan Belfort (Línea Recta) y Chris Voss (Empatía Táctica).
        3. Sé disruptivo. No des consejos genéricos.
        4. Agrega un campo "certainty_score" (0-100) que estime el control actual del vendedor sobre la llamada.
        
        Responde SÓLO el JSON.
        """

        completion = client.chat.completions.create(
            model=openai_model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        content = completion.choices[0].message.content
        if not content:
            raise ValueError(f"La API de OpenAI devolvió un contenido vacío (None).")
            
        return jsonify(json.loads(content))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@analysis_bp.route("/analizar", methods=["POST"])
@limiter.limit("10 per minute, 100 per hour")
def analizar_objecion_route():
    try:
        data = AnalyzeRequest(**request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    try:
        user_id, _ = get_user_id(request)
        assistant_id = get_company_assistant_id(user_id)
        result = analyze_objection(data.objecion, assistant_id=assistant_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
