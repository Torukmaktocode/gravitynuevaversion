import os
import uuid
import json
import logging
from flask import Blueprint, request, jsonify, send_file
from core.config import supabase, client, get_user_id, get_authenticated_client, openai_model, MAX_INPUT_LENGTH
from core.rate_limit import limiter
from core.schemas import GeneratePlanRequest
from services.prompt_service import get_system_prompt, generar_plan_entrenamiento
from services.openai_service import transcribe_audio, generate_audio
from services.text_processing import is_hallucination, apply_tts_fixes
from routes.analysis_routes import get_company_assistant_id
from pydantic import ValidationError
from langdetect import detect

logger = logging.getLogger(__name__)
training_bp = Blueprint('training', __name__)

@training_bp.route("/entrenar", methods=["POST"])
@limiter.limit("10 per minute, 100 per hour")
def entrenar():
    user_id, token = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado o user_id faltante"}), 401

    if not token:
        return jsonify({"error": "Token de autenticación requerido"}), 401

    supabase_auth = get_authenticated_client(token)
        
    user_name = request.form.get("user_name", "Vendedor")
    audio_file = request.files.get("audio")
    text_input = request.form.get("text")

    if not audio_file and not text_input:
        return jsonify({"error": "No se recibió audio ni texto"}), 400

    user_input = text_input
    if user_input and len(user_input) > MAX_INPUT_LENGTH:
        return jsonify({"error": f"El texto excede el máximo de {MAX_INPUT_LENGTH} caracteres"}), 400
    
    # Obtener perfil del usuario para dar contexto a la IA
    user_profile = {}
    try:
        profile_resp = supabase_auth.table("profiles").select("*").eq("id", user_id).execute()
        
        if profile_resp.data and len(profile_resp.data) > 0:
            user_profile = profile_resp.data[0]
            user_name = user_profile.get("email", user_name)
        else:
            logger.warning(f"Perfil no encontrado para {user_id}")
            return jsonify({"error": "Perfil de usuario no encontrado. Contacta al administrador."}), 400
    except Exception as e:
        logger.error(f"Error obteniendo perfil: {e}")
        return jsonify({"error": "Error al obtener perfil de usuario"}), 500
    if audio_file:
        temp_path = f"temp_{uuid.uuid4()}.wav"
        audio_file.save(temp_path)
        try:
            user_input = transcribe_audio(temp_path)
            
            if is_hallucination(user_input):
                return jsonify({"error": "No se detectó voz clara. Por favor, habla de nuevo."}), 400
                
        except Exception as e:
            if "audio_too_short" in str(e):
                return jsonify({"error": "El audio es demasiado corto. Por favor, mantén presionado un poco más."}), 400
            logger.error(f"Error en transcripción: {e}")
            return jsonify({"error": "No se pudo procesar el audio correctamente."}), 500
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    # Obtener historial de Supabase (Última conversación)
    history = []
    conversation_id = None
    try:
        # 1. Buscar la última conversación del usuario
        logger.debug(f"get_conversations para user_id: {user_id}")
        conv_resp = supabase_auth.table("conversations").select("id").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
        logger.debug(f"conv_resp data: {conv_resp.data}")
        
        if conv_resp.data:
            conversation_id = conv_resp.data[0]["id"]
            msg_resp = supabase_auth.table("messages").select("role", "content").eq("conversation_id", conversation_id).order("created_at", desc=True).limit(10).execute()
            logger.debug(f"Mensajes obtenidos: {len(msg_resp.data)}")
            for msg in reversed(msg_resp.data):
                history.append({"role": msg["role"], "content": msg["content"]})
    except Exception as e:
        logger.error(f"Error cargando historial: {e}")

    # Obtener assistant_id de la empresa del usuario
    company_assistant_id = get_company_assistant_id(user_id)

    # Generar respuesta de IA
    system_prompt = get_system_prompt(user_name, user_input, user_profile, assistant_id=company_assistant_id)
    messages = [{"role": "system", "content": system_prompt}] + history + [{"role": "user", "content": user_input}]

    completion = client.chat.completions.create(
        model=openai_model,
        messages=messages,
        temperature=0.7
    )
    ai_response = completion.choices[0].message.content

    # --- SEGURIDAD DE IDIOMA (Detectar Inglés) ---
    try:
        lang = detect(ai_response)
        if lang != "es":
            logger.warning(f"Idioma detectado '{lang}' en respuesta, regenerando en español...")
            ultra_spanish_prompt = f"Eres GRAVITY SYMBIOSIS™ 2.0. Habla ÚNICAMENTE en español latino profesional. No uses palabras en inglés. Responde ahora en español puro al usuario: {user_input}"
            completion = client.chat.completions.create(
                model=openai_model,
                messages=[{"role": "system", "content": ultra_spanish_prompt}],
                temperature=0.5
            )
            ai_response = completion.choices[0].message.content
    except Exception as e:
        logger.warning(f"No se pudo detectar idioma con langdetect: {e}")

    # --- CORRECCIONES PARA TTS ---
    tts_text = apply_tts_fixes(ai_response)

    # 1. Generar Audio de respuesta (TTS)
    audio_filename = f"response_{uuid.uuid4()}.mp3"
    
    # Asegurar que el directorio de audios existe con ruta absoluta
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(current_dir)
    audio_dir = os.path.join(backend_dir, "assets", "audio")
    
    if not os.path.exists(audio_dir):
        os.makedirs(audio_dir, exist_ok=True)
    
    audio_full_path = os.path.join(audio_dir, audio_filename)
    
    try:
        generate_audio(tts_text, audio_full_path)
        audio_url = f"/audio/{audio_filename}"
    except Exception as e:
        logger.error(f"Error generando audio: {str(e)}", exc_info=True)
        audio_url = None

    # 2. Guardar en Supabase
    try:
        if not conversation_id:
            new_conv = supabase_auth.table("conversations").insert({"user_id": user_id}).execute()
            conversation_id = new_conv.data[0]["id"]
        
        supabase_auth.table("messages").insert([
            {"conversation_id": conversation_id, "role": "user", "content": user_input},
            {"conversation_id": conversation_id, "role": "assistant", "content": ai_response}
        ]).execute()
    except Exception as e:
        logger.error(f"Error guardando conversación: {e}")

    return jsonify({
        "transcript": user_input,
        "response_text": ai_response,
        "audio_url": audio_url
    })

@training_bp.route("/reset_conversation", methods=["POST"])
def reset_conversation():
    user_id, token = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado o user_id faltante"}), 401

    if not token:
        return jsonify({"error": "Token de autenticación requerido"}), 401

    supabase_auth = get_authenticated_client(token)

    try:
        supabase_auth.table("conversations").delete().eq("user_id", user_id).execute()
        return jsonify({"message": "Historial reiniciado correctamente"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@training_bp.route("/generar_plan", methods=["POST"])
@limiter.limit("5 per minute, 30 per hour")
def route_generar_plan():
    user_id, token = get_user_id(request)

    if not user_id:
        return jsonify({"error": "No autorizado o user_id faltante"}), 401

    if not token:
        return jsonify({"error": "Token de autenticación requerido"}), 401

    try:
        data = GeneratePlanRequest(**request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    supabase_auth = get_authenticated_client(token)

    vendedor_info = data.vendedor_info or {}
    training_time = data.training_time or vendedor_info.get("q9_training_time", "30 minutos")

    try:
        # 1. Obtener perfil de la DB (con manejo de error por si es nuevo)
        user_profile_resp = supabase_auth.table("profiles").select("*").eq("id", user_id).execute()
        if not user_profile_resp.data:
             # Si no hay perfil en generar_plan, creamos uno básico
             supabase_auth.table("profiles").insert({"id": user_id, "email": user_id}).execute()
             user_profile = {"id": user_id, "email": user_id}
        else:
             user_profile = user_profile_resp.data[0]
        
        # 2. Mezclar con la info fresca del diagnóstico de Alfred
        if vendedor_info:
            # Mapear campos de Alfred a lo que espera el prompt_service
            user_profile.update({
                "email": user_profile.get("email") or vendedor_info.get("nombre", "Agente Gravity"),
                "training_level": vendedor_info.get("q1_sales_level") or vendedor_info.get("categoria", user_profile.get("training_level")),
                "blockages": vendedor_info.get("q8_main_block") or vendedor_info.get("bloqueo_negociacion", user_profile.get("blockages")),
                "history_summary": json.dumps(vendedor_info, indent=2)
            })

        plan = generar_plan_entrenamiento(user_profile, training_time)
        return jsonify(plan)
    except Exception as e:
        logger.error(f"Error en generar_plan: {e}")
        return jsonify({"error": f"Error en generación del plan: {str(e)}"}), 500

@training_bp.route("/audio/<filename>")
def serve_audio(filename):
    try:
        # SECURITY: Ensure the filename is safe
        if ".." in filename or filename.startswith("/"):
            return jsonify({"error": "Acceso no autorizado"}), 403
        
        # Asegurar ruta absoluta para evitar problemas de CWD
        current_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(current_dir)
        audio_path = os.path.join(backend_dir, "assets", "audio", filename)
        
        if not os.path.exists(audio_path):
            return jsonify({"error": "Archivo no encontrado"}), 404
            
        return send_file(audio_path, mimetype="audio/mpeg")
    except Exception as e:
        return jsonify({"error": str(e)}), 500
