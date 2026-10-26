import os
import logging
from flask import Flask, jsonify, request
from flask_cors import CORS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["http://localhost:*", "http://127.0.0.1:*"], supports_credentials=True)

# Mock user
MOCK_USER = {
    "id": "test-user-123",
    "email": "test@test.com",
    "role": "user",
    "company_id": None,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
}

MOCK_SESSION = {
    "access_token": "mock-access-token-123",
    "refresh_token": "mock-refresh-token-456",
    "expires_in": 3600,
    "token_type": "bearer",
    "user": MOCK_USER
}

@app.route("/")
def home():
    return jsonify({"status": "Gravity Symbiosis API (TEST MODE)", "version": "2.0.0-test"})

@app.route("/health")
def health():
    return jsonify({"status": "healthy"})

# ============================================
# SUPABASE REST API MOCKS
# ============================================

# Whitelist - permite cualquier email
@app.route("/rest/v1/email_whitelist", methods=["GET"])
def whitelist():
    email = request.args.get('email', '')
    select = request.args.get('select', '*')
    if email:
        return jsonify([{"email": email.lower()}])
    return jsonify([])

# Auth - token exchange (login)
@app.route("/auth/v1/token", methods=["POST"])
def auth_token():
    grant_type = request.form.get('grant_type') or request.json.get('grant_type')
    if grant_type == 'password':
        return jsonify(MOCK_SESSION)
    elif grant_type == 'refresh_token':
        return jsonify({
            "access_token": "mock-access-token-123",
            "refresh_token": "mock-refresh-token-456",
            "expires_in": 3600,
            "token_type": "bearer",
            "user": MOCK_USER
        })
    return jsonify({"error": "invalid_grant"}), 400

# Auth - signup
@app.route("/auth/v1/signup", methods=["POST"])
def auth_signup():
    return jsonify(MOCK_SESSION)

# Auth - get user (requires Authorization header)
@app.route("/auth/v1/user", methods=["GET"])
def auth_user():
    auth = request.headers.get('Authorization', '')
    if 'mock-access-token' in auth or 'Bearer' in auth:
        return jsonify(MOCK_USER)
    return jsonify({"error": "Invalid JWT"}), 401

# Auth - logout
@app.route("/auth/v1/logout", methods=["POST"])
def auth_logout():
    return jsonify({})

# Profiles table
@app.route("/rest/v1/profiles", methods=["GET", "POST", "PATCH"])
def profiles():
    if request.method == "GET":
        return jsonify([MOCK_USER])
    elif request.method == "POST":
        return jsonify(MOCK_USER), 201
    return jsonify(MOCK_USER)

# Conversations
@app.route("/rest/v1/conversations", methods=["GET", "POST"])
def conversations():
    if request.method == "GET":
        return jsonify([{
            "id": "conv-123",
            "user_id": "test-user-123",
            "created_at": "2026-09-15T10:00:00Z"
        }])
    return jsonify({"id": "conv-new", "user_id": "test-user-123"}), 201

# Messages
@app.route("/rest/v1/messages", methods=["GET", "POST"])
def messages():
    if request.method == "GET":
        return jsonify([
            {"id": "msg-1", "conversation_id": "conv-123", "role": "assistant", "content": "Hola. Estoy listo para entrenarte. Presiona el micrófono.", "created_at": "2026-09-15T10:00:00Z"}
        ])
    return jsonify({"id": "msg-new"}), 201

# Training endpoints
@app.route("/entrenar", methods=["POST"])
def entrenar():
    return jsonify({
        "transcript": "Hola, quiero practicar ventas",
        "response_text": "¡Perfecto! ¿Qué escenario quieres trabajar hoy? ¿Objeciones de precio, cierre, o prospección?",
        "audio_url": None
    })

@app.route("/conversations", methods=["GET"])
def get_conversations_legacy():
    return jsonify({
        "messages": [
            {"role": "assistant", "content": "Hola. Estoy listo para entrenarte. Presiona el micrófono."}
        ]
    })

@app.route("/generar_plan", methods=["POST"])
def generar_plan():
    return jsonify({
        "level": "Iniciado",
        "plan_de_entrenamiento": "<div class='p-4'>Plan de prueba generado</div>"
    })

@app.route("/analizar", methods=["POST"])
def analizar():
    return jsonify({
        "tipo_objecion": "Precio",
        "frase_killer": "Entiendo que el precio es importante. Pero pensemos en el costo de NO resolver este problema..."
    })

# Knowledge endpoints
@app.route("/conocimiento/modulos")
def modulos():
    return jsonify([
        {"id": "el-camino-del-lobo", "title": "El Camino del Lobo", "total_questions": 40},
        {"id": "rompe-la-barrera-del-no", "title": "Rompe la Barrera del No", "total_questions": 40},
        {"id": "ventas-spin", "title": "Ventas SPIN", "total_questions": 40},
        {"id": "las-48-leyes-del-poder", "title": "Las 48 Leyes del Poder", "total_questions": 48},
    ])

@app.route("/conocimiento", methods=["GET"])
def conocimiento():
    module = request.args.get('module', 'el-camino-del-lobo')
    return jsonify({
        "module": module,
        "items": [
            {"id": 1, "concepto": "Línea Recta", "enseñanza": "Venta directa", "ejemplo": "Ejemplo 1", "pregunta": "¿Qué es?", "respuesta": "Respuesta 1"}
        ]
    })

# Dashboard metrics
@app.route("/rest/v1/daily_metrics", methods=["GET"])
def daily_metrics():
    return jsonify([{
        "user_id": "test-user-123",
        "day": "2026-09-15",
        "training_minutes": 30,
        "closer_count": 5,
        "quiz_answers": 10,
        "total_minutes": 38,
        "sessions": 1
    }])

# Companies
@app.route("/rest/v1/companies", methods=["GET"])
def companies():
    return jsonify([{
        "id": "company-123",
        "name": "Gravity Test",
        "slug": "gravity-test",
        "openai_assistant_id": None
    }])

# Invitations
@app.route("/rest/v1/invitations", methods=["GET"])
def invitations():
    return jsonify([])

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    logger.info(f"Starting TEST server on port {port}")
    app.run(port=port, host="0.0.0.0", debug=True)