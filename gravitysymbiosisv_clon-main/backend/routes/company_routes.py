import logging
from flask import Blueprint, request, jsonify
from core.config import supabase, get_user_id, get_user_role, get_authenticated_client
from core.schemas import CreateCompanyRequest, UpdateCompanyRequest, AssignAdminRequest
from pydantic import ValidationError

logger = logging.getLogger(__name__)

company_bp = Blueprint('company', __name__)


# ─── HELPERS ────────────────────────────────────────────────────────────────

def require_super_admin(user_id, token=None):
    """Verifica que el usuario sea super_admin. Lanza excepción si no."""
    client = get_authenticated_client(token) if token else supabase
    profile = get_user_role(user_id, client)
    if profile["role"] != "super_admin":
        raise PermissionError("Se requiere rol super_admin")
    return profile


def require_admin(user_id, token=None):
    """Verifica que el usuario sea admin o super_admin."""
    client = get_authenticated_client(token) if token else supabase
    profile = get_user_role(user_id, client)
    if profile["role"] not in ("admin", "super_admin"):
        raise PermissionError("Se requiere rol admin o super_admin")
    return profile


# ─── COMPANY CRUD ───────────────────────────────────────────────────────────

@company_bp.route("/companies", methods=["GET"])
def list_companies():
    """
    GET /companies
    super_admin: ve todas las compañías
    admin: ve solo su compañía
    user: 403
    """
    user_id, token = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    client = get_authenticated_client(token) if token else supabase
    profile = get_user_role(user_id, client)
    
    if profile["role"] == "super_admin":
        resp = client.table("companies").select("*").order("name").execute()
        return jsonify(resp.data or [])

    if profile["role"] in ("admin", "super_admin") and profile.get("company_id"):
        resp = client.table("companies").select("*").eq("id", profile["company_id"]).execute()
        return jsonify(resp.data or [])

    logger.debug(f"/companies - user_id: {user_id}, profile: {profile}")
    return jsonify({"error": f"No tienes permiso para ver compañías (role: {profile.get('role')})"}), 403


@company_bp.route("/companies", methods=["POST"])
def create_company():
    """
    POST /companies
    Body: { name, slug, logo_url?, settings? }
    Solo super_admin
    """
    user_id, token = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401

    try:
        require_super_admin(user_id, token)
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403

    try:
        data = CreateCompanyRequest(**request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    try:
        client_auth = get_authenticated_client(token) if token else supabase
        resp = client_auth.table("companies").insert({
            "name": data.name,
            "slug": data.slug,
            "logo_url": data.logo_url,
            "settings": data.settings or {},
        }).execute()

        if resp.data and len(resp.data) > 0:
            return jsonify(resp.data[0]), 201
        return jsonify({"error": "Error creando compañía"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@company_bp.route("/companies/<uuid:company_id>", methods=["GET", "PATCH", "DELETE"])
def company_detail(company_id):
    """
    GET/PATCH/DELETE /companies/<id>
    super_admin: acceso total
    admin: solo su compañía
    """
    user_id, token = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401

    client = get_authenticated_client(token) if token else supabase
    profile = get_user_role(user_id, client)

    # Validar acceso
    is_super = profile["role"] == "super_admin"
    is_own_company = profile.get("company_id") and str(profile["company_id"]) == str(company_id)

    if not is_super and not is_own_company:
        return jsonify({"error": "No tienes permiso para acceder a esta compañía"}), 403

    company_id_str = str(company_id)

    if request.method == "GET":
        resp = client.table("companies").select("*").eq("id", company_id_str).execute()
        if resp.data and len(resp.data) > 0:
            return jsonify(resp.data[0])
        return jsonify({"error": "Compañía no encontrada"}), 404

    if request.method == "PATCH":
        if not is_super:
            return jsonify({"error": "Solo super_admin puede modificar la compañía"}), 403

        data = request.json
        updates = {}
        for field in ("name", "slug", "logo_url", "settings", "is_active"):
            if field in data:
                updates[field] = data[field]

        if not updates:
            return jsonify({"error": "No hay campos para actualizar"}), 400

        resp = client.table("companies").update(updates).eq("id", company_id_str).execute()
        if resp.data and len(resp.data) > 0:
            return jsonify(resp.data[0])
        return jsonify({"error": "Error actualizando compañía"}), 500

    if request.method == "DELETE":
        if not is_super:
            return jsonify({"error": "Solo super_admin puede eliminar compañías"}), 403

        client.table("companies").delete().eq("id", company_id_str).execute()
        return jsonify({"message": "Compañía eliminada"}), 200


# ─── COMPANY ADMIN ASSIGNMENT ──────────────────────────────────────────────

@company_bp.route("/companies/<uuid:company_id>/assign-admin", methods=["POST"])
def assign_admin(company_id):
    """
    POST /companies/<id>/assign-admin
    Body: { user_id: uuid }
    Asigna un usuario como admin de una compañía.
    Solo super_admin.
    """
    user_id, token = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401

    try:
        require_super_admin(user_id, token)
        client_admin = get_authenticated_client(token) if token else supabase
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403

    try:
        data = AssignAdminRequest(**request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    try:
        resp = client_admin.table("profiles").update({
            "role": "admin",
            "company_id": str(company_id),
        }).eq("id", data.user_id).execute()

        if resp.data and len(resp.data) > 0:
            return jsonify(resp.data[0])
        return jsonify({"error": "Usuario no encontrado"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── COMPANY USERS ─────────────────────────────────────────────────────────

@company_bp.route("/companies/<uuid:company_id>/users", methods=["GET"])
def list_company_users(company_id):
    """
    GET /companies/<id>/users
    Lista usuarios de una compañía.
    super_admin: todas las compañías
    admin: solo su compañía
    """
    user_id, token = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401

    try:
        profile = require_admin(user_id, token)
        client = get_authenticated_client(token) if token else supabase
        
        # Validar permisos
        if profile["role"] == "admin" and str(profile.get("company_id")) != str(company_id):
            return jsonify({"error": "No puedes ver usuarios de otra compañía"}), 403

        resp = client.table("profiles").select("*").eq("company_id", str(company_id)).execute()
        return jsonify(resp.data or [])
    except Exception as e:
        return jsonify({"error": str(e)}), 403


# ─── CURRENT USER COMPANY ──────────────────────────────────────────────────

@company_bp.route("/my-company", methods=["GET"])
def get_my_company():
    """
    GET /my-company
    Devuelve la compañía del usuario autenticado.
    """
    user_id, token = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401

    profile = get_user_role(user_id, supabase)
    if not profile.get("company_id"):
        return jsonify({"error": "No tienes compañía asignada"}), 404

    resp = supabase.table("companies").select("*").eq("id", profile["company_id"]).execute()
    if resp.data and len(resp.data) > 0:
        return jsonify(resp.data[0])
    return jsonify({"error": "Compañía no encontrada"}), 404
