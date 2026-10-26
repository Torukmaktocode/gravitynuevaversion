from flask import Flask, jsonify
from flask_cors import CORS
import os
import logging
from core.logging_config import setup_logging
from core.rate_limit import limiter

setup_logging()
logger = logging.getLogger(__name__)

from routes.auth_routes import auth_bp
from routes.training_routes import training_bp
from routes.analysis_routes import analysis_bp
from routes.knowledge_routes import knowledge_bp
from routes.company_routes import company_bp
from routes.invitation_routes import invitation_bp

app = Flask(__name__)

limiter.init_app(app)

CORS(app, origins=[
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:4173",
    "https://gravitysymbiosis.com",
    "https://www.gravitysymbiosis.com",
    "https://dev.gravitysymbiosis.com",
])

app.register_blueprint(auth_bp)
app.register_blueprint(training_bp)
app.register_blueprint(analysis_bp)
app.register_blueprint(knowledge_bp)
app.register_blueprint(company_bp)
app.register_blueprint(invitation_bp)

@app.errorhandler(400)
def bad_request(e):
    return jsonify({"error": "Solicitud inválida"}), 400

@app.errorhandler(401)
def unauthorized(e):
    return jsonify({"error": "No autorizado"}), 401

@app.errorhandler(403)
def forbidden(e):
    return jsonify({"error": "Acceso denegado"}), 403

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Recurso no encontrado"}), 404

@app.errorhandler(429)
def ratelimit_error(e):
    return jsonify({"error": "Demasiadas solicitudes. Intenta de nuevo en un momento."}), 429

@app.errorhandler(500)
def internal_error(e):
    logger.error(f"Error interno del servidor: {e}")
    return jsonify({"error": "Error interno del servidor"}), 500

@app.route("/")
def home():
    return jsonify({
        "status": "Gravity Symbiosis API is running",
        "version": "2.0.0-modular"
    })

@app.route("/health")
def health():
    return jsonify({"status": "healthy"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(port=port, host="0.0.0.0")
