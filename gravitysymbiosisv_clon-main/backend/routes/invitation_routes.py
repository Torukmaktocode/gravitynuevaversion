import uuid
import logging
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify
from core.config import supabase, get_user_id, get_user_role
from core.schemas import CreateInvitationRequest, AcceptInvitationRequest
from pydantic import ValidationError

logger = logging.getLogger(__name__)

invitation_bp = Blueprint('invitation', __name__)


# ─── CREATE INVITATION ─────────────────────────────────────────────────────

@invitation_bp.route("/invitations", methods=["POST"])
def create_invitation():
    """
    POST /invitations
    Body: { email, role?: 'user' | 'admin' }
    Crea una invitación para unirse a la compañía del admin.
    El admin debe tener company_id asignado.
    """
    user_id, token = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401

    profile = get_user_role(user_id)
    if profile["role"] not in ("admin", "super_admin"):
        return jsonify({"error": "No tienes permiso para invitar usuarios"}), 403

    if not profile.get("company_id"):
        return jsonify({"error": "No tienes compañía asignada"}), 400

    try:
        inv_data = CreateInvitationRequest(**request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    email = inv_data.email.strip().lower()
    role = inv_data.role

    if role == "admin" and profile["role"] != "super_admin":
        return jsonify({"error": "Solo super_admin puede invitar admins"}), 403

    existing = supabase.table("company_invitations").select("id, token").eq("email", email).eq("accepted_at", None).gte("expires_at", datetime.now(timezone.utc).isoformat()).execute()
    if existing.data and len(existing.data) > 0:
        return jsonify({"error": "Ya existe una invitación pendiente para este email"}), 409

    token = str(uuid.uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

    try:
        resp = supabase.table("company_invitations").insert({
            "company_id": profile["company_id"],
            "email": email,
            "role": role,
            "token": token,
            "invited_by": user_id,
            "expires_at": expires_at,
        }).execute()

        if resp.data and len(resp.data) > 0:
            invitation = resp.data[0]

            # Aquí se debería enviar un email con el link de aceptación
            # accept_url = f"{request.host_url}dashboard?invitation_token={token}"
            # TODO: Integrar con servicio de emails (Resend, SendGrid, etc.)

            return jsonify({
                "message": "Invitación creada exitosamente",
                "invitation": invitation,
                "accept_link": f"{request.host_url}dashboard?invitation_token={token}",
            }), 201

        return jsonify({"error": "Error creando invitación"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── LIST INVITATIONS ──────────────────────────────────────────────────────

@invitation_bp.route("/invitations", methods=["GET"])
def list_invitations():
    """
    GET /invitations
    Lista invitaciones de la compañía del usuario autenticado.
    Filtros opcionales: ?status=pending|accepted|expired
    """
    user_id, token = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401

    profile = get_user_role(user_id)
    if profile["role"] not in ("admin", "super_admin"):
        return jsonify({"error": "No tienes permiso"}), 403

    query = supabase.table("company_invitations").select("*, invited_by_profile:invited_by(email, first_name, last_name)")

    if profile["role"] == "admin":
        query = query.eq("company_id", profile["company_id"])

    status = request.args.get("status")
    if status == "pending":
        query = query.is_("accepted_at", "null").gte("expires_at", datetime.now(timezone.utc).isoformat())
    elif status == "accepted":
        query = query.not_.is_("accepted_at", "null")
    elif status == "expired":
        query = query.is_("accepted_at", "null").lt("expires_at", datetime.now(timezone.utc).isoformat())

    resp = query.order("created_at", desc=True).execute()
    return jsonify(resp.data or [])


# ─── ACCEPT INVITATION ─────────────────────────────────────────────────────

@invitation_bp.route("/invitations/accept", methods=["POST"])
def accept_invitation():
    """
    POST /invitations/accept
    Body: { token: string }
    Acepta una invitación usando el token.
    El usuario debe estar autenticado y su email debe coincidir.
    """
    user_id, token = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401

    try:
        accept_data = AcceptInvitationRequest(**request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400
    invitation_token = accept_data.token

    # Obtener la invitación
    resp = supabase.table("company_invitations").select("*").eq("token", invitation_token).execute()
    if not resp.data or len(resp.data) == 0:
        return jsonify({"error": "Invitación no encontrada"}), 404

    invitation = resp.data[0]

    # Verificar que el email coincida
    user_resp = supabase.auth.get_user(token)
    if not user_resp or not user_resp.user:
        return jsonify({"error": "No se pudo verificar el usuario"}), 401

    user_email = user_resp.user.email
    if user_email.lower() != invitation["email"].lower():
        return jsonify({"error": "Esta invitación no corresponde a tu email"}), 403

    # Verificar que no haya expirado
    expires_at = datetime.fromisoformat(invitation["expires_at"].replace("Z", "+00:00"))
    if expires_at < datetime.now(timezone.utc):
        return jsonify({"error": "La invitación ha expirado"}), 410

    # Verificar que no haya sido aceptada
    if invitation.get("accepted_at"):
        return jsonify({"error": "La invitación ya fue aceptada"}), 410

    # Actualizar el perfil del usuario
    try:
        supabase.table("profiles").update({
            "company_id": invitation["company_id"],
            "role": invitation["role"],
            "invited_by": invitation["invited_by"],
        }).eq("id", user_id).execute()

        # Marcar invitación como aceptada
        supabase.table("company_invitations").update({
            "accepted_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", invitation["id"]).execute()

        return jsonify({"message": "Invitación aceptada exitosamente"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── REVOKE INVITATION ─────────────────────────────────────────────────────

@invitation_bp.route("/invitations/<uuid:invitation_id>", methods=["DELETE"])
def revoke_invitation(invitation_id):
    """
    DELETE /invitations/<id>
    Revoca (elimina) una invitación pendiente.
    Solo admin de la compañía o super_admin.
    """
    user_id, token = get_user_id(request)
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401

    profile = get_user_role(user_id)
    if profile["role"] not in ("admin", "super_admin"):
        return jsonify({"error": "No tienes permiso"}), 403

    # Verificar que la invitación pertenezca a la compañía del admin
    inv_resp = supabase.table("company_invitations").select("company_id").eq("id", str(invitation_id)).execute()
    if not inv_resp.data or len(inv_resp.data) == 0:
        return jsonify({"error": "Invitación no encontrada"}), 404

    inv = inv_resp.data[0]
    if profile["role"] == "admin" and str(inv["company_id"]) != str(profile["company_id"]):
        return jsonify({"error": "No tienes permiso para revocar esta invitación"}), 403

    supabase.table("company_invitations").delete().eq("id", str(invitation_id)).execute()
    return jsonify({"message": "Invitación revocada"}), 200
