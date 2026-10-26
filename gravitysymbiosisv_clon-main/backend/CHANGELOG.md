# Changelog — Backend Gravity Symbiosis

## Sesión 2026-07-10 — Correcciones de seguridad, calidad y mantenibilidad

### 🔴 Críticos

#### C1 — Bypass de validación JWT con decodificación manual
- **Archivo:** `core/config.py:43-52`
- **Cambio:** Eliminada la decodificación manual del JWT (base64 sin verificar firma). Ahora solo se usa `supabase.auth.get_user(token)`.
- **Riesgo anterior:** Cualquier token manipulado/vencido era aceptado si tenía un `sub` en el payload.

#### C2 — Excepción de autenticación silenciada
- **Archivo:** `core/config.py:40-41`
- **Cambio:** El `except Exception: pass` fue reemplazado por `logger.error()` con el mensaje real del error y retorno explícito de `None`.
- **Riesgo anterior:** Fallos de red, Supabase caído o tokens inválidos se ocultaban completamente.

#### C3 — Service Role expuesto como fallback
- **Archivo:** `core/config.py:61`
- **Cambio:** `get_authenticated_client(None)` ya no retorna el cliente global con service_role. Ahora lanza `ValueError`. Todos los endpoints reforzados con chequeo `if not token: return 401`.
- **Riesgo anterior:** Sin token se operaba con permisos de service_role, bypassando RLS.

#### C4 — Token Supabase Management expuesto en texto plano
- **Archivo:** `tools/check_auth_config.py:5`
- **Cambio:** Token `sbp_***REDACTED***` eliminado. Ahora se lee de variables de entorno `SUPABASE_MANAGEMENT_TOKEN` y `SUPABASE_PROJECT_REF`. SSL verification habilitado.
- **Riesgo anterior:** Token administrativo de Supabase hardcodeado en el repo.
- **⚠️ Acción requerida:** Rotar el token desde el dashboard de Supabase.

### 🟠 Altos

#### A1 — Error handlers HTTP + Debug mode
- **Archivo:** `app.py:34-56`
- **Cambio:** Agregados handlers JSON para 400, 401, 403, 404, 429, 500. Eliminado `debug=True` del `app.run()`.
- **Riesgo anterior:** Excepciones no capturadas retornaban HTML plano de Flask; debug mode exponía información sensible.

#### A2 — CORS abierto
- **Archivo:** `app.py:19-25`
- **Cambio:** `CORS(app)` → `CORS(app, origins=[...])` listando solo orígenes explícitos (localhost, dominio producción).
- **Riesgo anterior:** Cualquier sitio web podía hacer peticiones a la API.

#### A3 — Duplicado en tupla de roles
- **Archivo:** `routes/company_routes.py:34,60,217`
- **Cambio:** `("admin", "admin", "super_admin")` → `("admin", "super_admin")` y `("admin", "admin")` → `"admin"`.
- **Riesgo anterior:** Funcionaba por casualidad, pero copy-paste error podía propagarse.

#### A4 — Validación de schemas con Pydantic
- **Archivo:** Nuevo `core/schemas.py` + modificaciones en `routes/auth_routes.py`, `routes/analysis_routes.py`, `routes/company_routes.py`, `routes/invitation_routes.py`, `routes/training_routes.py`
- **Cambio:** Schemas tipados para RegisterRequest, LoginRequest, AnalyzeRequest, CopilotAnalyzeRequest, CreateCompanyRequest, UpdateCompanyRequest, AssignAdminRequest, CreateInvitationRequest, AcceptInvitationRequest, GeneratePlanRequest. Validación automática en todos los endpoints JSON.
- **Dependencia:** `pydantic>=2.0.0` agregada a `requirements.txt`

#### A6 — Robustecer creación de perfiles inline
- **Archivo:** `routes/training_routes.py:43-55`
- **Cambio:** Se mantienen los perfiles inline por compatibilidad, pero ahora con logging explícito. La vía principal sigue siendo el trigger `handle_new_user` (migración 20260701).

### 🟡 Medios

#### M1 — Rate limiting en endpoints OpenAI
- **Archivo:** Nuevo `core/rate_limit.py` + modificaciones en `app.py`, `routes/training_routes.py`, `routes/analysis_routes.py`
- **Cambio:** Límites por usuario (vía JWT o IP):
  - `POST /entrenar`: 10/min, 100/hora
  - `POST /generar_plan`: 5/min, 30/hora
  - `POST /analizar`: 10/min, 100/hora
  - `POST /copilot_analyze`: 20/min, 200/hora
- **Storage:** `memory://` por defecto, configurable via `RATE_LIMIT_STORAGE` (Redis para producción)
- **Dependencia:** `flask-limiter>=3.0.0`

#### M2 — Detección de idioma con langdetect
- **Archivo:** `routes/training_routes.py:116-131`
- **Cambio:** Reemplazada la lista de palabras clave inglesas por `langdetect.detect()`. Elimina falsos positivos (ej. "you" en "tú y yo").
- **Dependencia:** `langdetect>=1.0.9`

#### M4 — Logging estructurado
- **Archivo:** Nuevo `core/logging_config.py` + modificaciones en todos los archivos.
- **Cambio:** Formato unificado `"%(asctime)s [%(levelname)s] %(name)s: %(message)s"`. Todos los `print()` del backend reemplazados por `logger.info/warning/error/debug`.
- **Configuración:** `basicConfig` centralizado en `logging_config.py`, importado desde `app.py` y `core/config.py`.

#### M5 — Tests unitarios
- **Archivo:** Nuevos `tests/test_schemas.py`, `tests/test_english_detection.py`, `tests/conftest.py`
- **Cambio:** 23 tests pytest que validan schemas Pydantic y detección de idioma. Todos pasando.
- **Ejecución:** `.venv/bin/python -m pytest tests/`

### 🟢 Bajos

#### B1 — stream_to_file deprecated
- **Archivo:** `services/openai_service.py:169-172`
- **Cambio:** Eliminado el fallback a `stream_to_file()`. Solo se usa `response.write_to_file()`.

#### B2 — Importaciones inline
- **Archivo:** `routes/training_routes.py`, `routes/knowledge_routes.py`
- **Cambio:** `from core.config import get_authenticated_client` movido al tope del archivo, eliminadas las 4 importaciones inline dentro de funciones.

#### B3 — Puerto hardcodeado en tests
- **Archivo:** `tests/test_endpoint.py:5`, `tests/test_trainer_logic.py:5`
- **Cambio:** `5000` → `5001`.

---

### Archivos nuevos
| Archivo | Propósito |
|---------|-----------|
| `core/schemas.py` | Schemas Pydantic para validación de requests |
| `core/logging_config.py` | Configuración centralizada de logging |
| `core/rate_limit.py` | Rate limiter con key por usuario/IP |
| `tests/test_schemas.py` | 19 tests de validación de schemas |
| `tests/test_english_detection.py` | 4 tests de detección de idioma |
| `tests/conftest.py` | Configuración de path para pytest |

### Dependencias nuevas
| Librería | Versión | Propósito |
|----------|---------|-----------|
| `pydantic` | >=2.0.0 | Validación de schemas |
| `langdetect` | >=1.0.9 | Detección de idioma |
| `flask-limiter` | >=3.0.0 | Rate limiting |
