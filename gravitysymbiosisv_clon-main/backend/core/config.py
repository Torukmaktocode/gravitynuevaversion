import os
import logging
from openai import OpenAI
from supabase import create_client, Client
from dotenv import load_dotenv
from core.logging_config import setup_logging

setup_logging()
load_dotenv()

logger = logging.getLogger(__name__)

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("No se encontró la variable de entorno OPENAI_API_KEY.")

org_id = os.getenv("OPENAI_ORG_ID") or os.getenv("OPENAI_ORG") or os.getenv("OPENAI_ORGANIZATION")
if org_id:
    client = OpenAI(api_key=api_key, organization=org_id)
    logger.info(f"OpenAI org configurada: {org_id[:12]}...")
else:
    client = OpenAI(api_key=api_key)

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Faltan variables de entorno para Supabase.")

supabase: Client = create_client(supabase_url, supabase_key)

openai_model = os.getenv("OPENAI_MODEL", "gpt-5.4-mini")
MAX_INPUT_LENGTH = 4000

def get_user_id(request):
    auth_header = request.headers.get("Authorization")
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            user_resp = supabase.auth.get_user(token)
            if user_resp and user_resp.user:
                return user_resp.user.id, token
        except Exception as e:
            logger.error(f"Error verificando token JWT con Supabase: {e}")
            return None, token
    return None, token

def get_user_role(user_id, supabase_client=None):
    client = supabase_client or supabase
    try:
        resp = client.table("profiles").select("role, company_id").eq("id", user_id).execute()
        if resp.data and len(resp.data) > 0:
            return resp.data[0]
    except Exception as e:
        logger.error(f"Error obteniendo role: {e}")
    return {"role": None, "company_id": None}

def get_authenticated_client(token):
    if not token:
        raise ValueError("Se requiere token de autenticación para crear cliente autenticado")
    auth_client = create_client(supabase_url, supabase_key)
    auth_client.postgrest.auth(token)
    return auth_client
