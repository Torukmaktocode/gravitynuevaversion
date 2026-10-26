from flask import Blueprint, request, jsonify
from core.config import supabase
from core.schemas import RegisterRequest, LoginRequest
from pydantic import ValidationError

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    try:
        data = RegisterRequest(**request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    try:
        auth_response = supabase.auth.sign_up({"email": data.email, "password": data.password})
        if auth_response.user:
            supabase.table("profiles").insert({
                "id": auth_response.user.id,
                "email": data.email
            }).execute()
            return jsonify({"message": "Usuario registrado exitosamente", "user": auth_response.user.id}), 201
        return jsonify({"error": "Error al registrar usuario"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = LoginRequest(**request.json)
    except ValidationError as e:
        return jsonify({"error": e.errors()}), 400

    try:
        auth_response = supabase.auth.sign_in_with_password({"email": data.email, "password": data.password})
        if auth_response.user:
            return jsonify({
                "message": "Login exitoso",
                "access_token": auth_response.session.access_token,
                "user": {
                    "id": auth_response.user.id,
                    "email": auth_response.user.email
                }
            }), 200
        return jsonify({"error": "Credenciales inválidas"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route("/profile", methods=["GET"])
def get_profile():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "user_id es requerido"}), 400

    try:
        response = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if response.data and len(response.data) > 0:
            return jsonify(response.data[0])
        return jsonify(None), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
