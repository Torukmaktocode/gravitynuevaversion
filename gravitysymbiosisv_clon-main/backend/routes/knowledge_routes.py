import logging
from flask import Blueprint, request, jsonify, make_response
from core.config import supabase, get_user_id, get_user_role, get_authenticated_client

logger = logging.getLogger(__name__)
knowledge_bp = Blueprint('knowledge', __name__)

def _get_auth_client():
    user_id, token = get_user_id(request)
    if user_id and token:
        return get_authenticated_client(token)
    return supabase


def _require_admin():
    user_id, token = get_user_id(request)
    if not user_id:
        return None, jsonify({"error": "No autorizado"}), 401
    profile = get_user_role(user_id)
    if profile["role"] not in ("admin", "super_admin"):
        return None, jsonify({"error": "No tienes permiso"}), 403
    return user_id, None, None

@knowledge_bp.route("/conocimiento/modulos", methods=["GET"])
def list_modulos():
    company_id = request.args.get("company_id")
    if not company_id:
        return jsonify({"error": "company_id es requerido"}), 400

    client = _get_auth_client()
    result = client.table("knowledge_content") \
        .select("module, module_title, orden") \
        .eq("company_id", company_id) \
        .execute()

    rows = result.data if result.data else []

    modules_map = {}
    for r in rows:
        mod = r["module"]
        if mod not in modules_map:
            modules_map[mod] = {
                "id": mod,
                "title": r["module_title"],
                "total": 0,
            }
        modules_map[mod]["total"] += 1

    # Sort by min orden within each module for consistent order
    order_map = {}
    for r in rows:
        mod = r["module"]
        if mod not in order_map or r["orden"] < order_map[mod]:
            order_map[mod] = r["orden"]

    sorted_modules = sorted(modules_map.values(), key=lambda m: order_map.get(m["id"], 0))

    return jsonify(sorted_modules)


@knowledge_bp.route("/conocimiento", methods=["GET"])
def handle_conocimiento():
    modulo_solicitado = request.args.get("modulo")
    company_id = request.args.get("company_id")

    if not modulo_solicitado:
        return jsonify({"error": "Módulo no especificado"}), 400

    # If company_id provided, query from per-company knowledge_content table
    if company_id:
        client = _get_auth_client()
        result = client.table("knowledge_content") \
            .select("concepto, enseñanza, ejemplo, pregunta, opciones, respuesta") \
            .eq("company_id", company_id) \
            .eq("module", modulo_solicitado) \
            .order("orden") \
            .execute()

        items = result.data if result.data else []

        if not items:
            return jsonify({"error": "Módulo no encontrado"}), 404

        response = make_response(jsonify(items))
        response.headers["X-Debug-Gravity"] = "Version-Modular"
        return response

    return jsonify({"error": "company_id es requerido"}), 400


@knowledge_bp.route("/conocimiento/admin", methods=["GET", "POST", "PUT", "DELETE"])
def admin_conocimiento():
    user_id, err, status = _require_admin()
    if err:
        return err, status

    company_id = request.args.get("company_id")
    if not company_id:
        return jsonify({"error": "company_id es requerido"}), 400

    client = _get_auth_client()

    if request.method == "GET":
        modulo = request.args.get("modulo")
        if modulo:
            result = client.table("knowledge_content") \
                .select("*") \
                .eq("company_id", company_id) \
                .eq("module", modulo) \
                .order("orden") \
                .execute()
            return jsonify(result.data or [])
        else:
            result = client.table("knowledge_content") \
                .select("module, module_title, orden") \
                .eq("company_id", company_id) \
                .order("module") \
                .order("orden") \
                .execute()
            rows = result.data or []
            modules_map = {}
            for r in rows:
                mod = r["module"]
                if mod not in modules_map:
                    modules_map[mod] = {
                        "id": mod,
                        "title": r["module_title"],
                        "total": 0,
                    }
                modules_map[mod]["total"] += 1
            sorted_modules = sorted(modules_map.values(), key=lambda m: m["id"])
            return jsonify(sorted_modules)

    if request.method == "POST":
        data = request.get_json()
        if not data:
            return jsonify({"error": "Datos requeridos"}), 400
        required_fields = ["module", "module_title", "concepto", "enseñanza", "ejemplo", "pregunta", "respuesta"]
        missing = [f for f in required_fields if f not in data]
        if missing:
            return jsonify({"error": f"Faltan campos requeridos: {', '.join(missing)}"}), 400
        data["company_id"] = company_id
        result = client.table("knowledge_content").insert(data).execute()
        return jsonify(result.data[0] if result.data else {}), 201

    if request.method == "PUT":
        data = request.get_json()
        if not data:
            return jsonify({"error": "Datos requeridos"}), 400
        item_id = data.pop("id", None)
        if not item_id:
            return jsonify({"error": "id requerido"}), 400
        result = client.table("knowledge_content").update(data).eq("id", item_id).eq("company_id", company_id).execute()
        return jsonify(result.data[0] if result.data else {})

    if request.method == "DELETE":
        item_id = request.args.get("id")
        if not item_id:
            return jsonify({"error": "id requerido"}), 400
        client.table("knowledge_content").delete().eq("id", item_id).eq("company_id", company_id).execute()
        return jsonify({"success": True})


@knowledge_bp.route("/conversations", methods=["GET"])
def get_conversations():
    user_id, token = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado o user_id faltante"}), 401

    if not token:
        return jsonify({"error": "Token de autenticación requerido"}), 401

    supabase_auth = get_authenticated_client(token)

    try:
        logger.debug(f"get_conversations para user_id: {user_id}")
        conv_resp = supabase_auth.table("conversations").select("id").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
        logger.debug(f"conv_resp data: {conv_resp.data}")

        if not conv_resp.data:
            return jsonify({"messages": []})

        conv_id = conv_resp.data[0]["id"]

        msg_resp = supabase_auth.table("messages").select("role", "content", "created_at").eq("conversation_id", conv_id).order("created_at", desc=True).limit(50).execute()
        logger.debug(f"Mensajes obtenidos: {len(msg_resp.data)}")

        return jsonify({"messages": list(reversed(msg_resp.data))})
    except Exception as e:
        logger.error(f"Error en get_conversations: {e}")
        return jsonify({"error": str(e)}), 500
