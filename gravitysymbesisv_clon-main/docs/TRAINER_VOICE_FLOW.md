# Trainer / Voice Flow — Documentación Completa

## Tabla de Contenidos

1. [Resumen del Sistema](#1-resumen-del-sistema)
2. [Arquitectura General](#2-arquitectura-general)
3. [Frontend — Hold-to-Talk State Machine](#3-frontend--hold-to-talk-state-machine)
4. [Frontend — Grabación de Audio](#4-frontend--grabación-de-audio)
5. [Frontend — Envío al Backend](#5-frontend--envío-al-backend)
6. [Backend — Endpoint `/entrenar`](#6-backend--endpoint-entrenar)
7. [Backend — Transcripción (Whisper)](#7-backend--transcripción-whisper)
8. [Backend — Detección de Alucinaciones](#8-backend--detección-de-alucinaciones)
9. [Backend — Historial y Contexto](#9-backend--historial-y-contexto)
10. [Backend — Perfil de Usuario y Assistant](#10-backend--perfil-de-usuario-y-assistant)
11. [Backend — Clasificación de Intención](#11-backend--clasificación-de-intención)
12. [Backend — Generación del System Prompt](#12-backend--generación-del-system-prompt)
13. [Backend — Llamada a OpenAI (LLM)](#13-backend--llamada-a-openai-llm)
14. [Backend — Seguridad de Idioma](#14-backend--seguridad-de-idioma)
15. [Backend — Correcciones TTS](#15-backend--correcciones-tts)
16. [Backend — Generación de Audio (TTS)](#16-backend--generación-de-audio-tts)
17. [Backend — Persistencia en Supabase](#17-backend--persistencia-en-supabase)
18. [Backend — Respuesta al Frontend](#18-backend--respuesta-al-frontend)
19. [Frontend — Recepción y Reproducción](#19-frontend--recepción-y-reproducción)
20. [Frontend — Visualización del Orb](#20-frontend--visualización-del-orb)
21. [Frontend — Chat Drawer (Transcripción)](#21-frontend--chat-drawer-transcripción)
22. [Frontend — Timer de Entrenamiento](#22-frontend--timer-de-entrenamiento)
23. [Frontend — Visualizador de Audio](#23-frontend--visualizador-de-audio)
24. [Seguridad y Rate Limiting](#24-seguridad-y-rate-limiting)
25. [Configuración y Variables de Entorno](#25-configuración-y-variables-de-entorno)
26. [Archivos Involucrados](#26-archivos-involucrados)
27. [Diagrama de Flujo Completo](#27-diagrama-de-flujo-completo)

---

## 1. Resumen del Sistema

El **Trainer** es un entrenador de ventas por voz que simula conversaciones reales con un prospecto. El usuario mantiene presionado un botón de micrófono, habla, y al soltar el sistema:

1. Graba audio con `MediaRecorder`
2. Envía el audio al backend Flask
3. El backend transcribe con **OpenAI Whisper**
4. El backend genera una respuesta con **GPT-5.4-mini** (model configurable via env `OPENAI_MODEL`)
5. El backend genera audio TTS con **OpenAI TTS** (voz `shimmer`, speed 1.1x)
6. El frontend reproduce el audio y muestra la transcripción en un chat

El flujo es **cíclico**: cada turno alimenta el historial de la conversación, permitiendo que la IA recuerde el contexto previo.

---

## 2. Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (TypeScript)                    │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │ trainerHold  │   │   Trainer.ts │   │  ParticleOrb   │  │
│  │ (state machine│──▶│ (orchestrator)│──▶│ (canvas orb)   │  │
│  │  hold-to-talk)│   │              │   └────────────────┘  │
│  └──────────────┘   └──────┬───────┘                        │
│                            │                                │
│                    POST /entrenar                           │
│                     (FormData:                              │
│                      audio + user_name)                     │
└────────────────────────────┼────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (Flask/Python)                   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              training_routes.py                       │   │
│  │  1. Auth JWT (supabase)                              │   │
│  │  2. Validación audio/texto                           │   │
│  │  3. Perfil de usuario (profiles)                     │   │
│  │  4. Transcripción → Whisper                          │   │
│  │  5. Alucinación check                                │   │
│  │  6. Historial (conversations + messages)              │   │
│  │  7. Assistant ID de empresa                          │   │
│  │  8. System prompt (prompt_service)                   │   │
│  │  9. LLM response (GPT)                               │   │
│  │ 10. Idioma check (langdetect)                        │   │
│  │ 11. TTS fixes (text_processing)                      │   │
│  │ 12. Audio TTS (OpenAI TTS)                           │   │
│  │ 13. Persistir mensajes en Supabase                   │   │
│  │ 14. Retornar {transcript, response_text, audio_url}  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────┐  ┌────────────────────────────┐     │
│  │ openai_service.py  │  │ prompt_service.py           │     │
│  │ - transcribe_audio │  │ - clasificar_intencion       │     │
│  │ - generate_audio   │  │ - get_system_prompt          │     │
│  │ - get_assistant_kn.│  │ - generar_plan_entrenamiento │     │
│  └────────────────────┘  └────────────────────────────┘     │
│                                                             │
│  ┌────────────────────┐  ┌────────────────────────────┐     │
│  │ text_processing.py │  │ config.py                   │     │
│  │ - is_hallucination  │  │ - openai (client)           │     │
│  │ - apply_tts_fixes   │  │ - supabase (client)         │     │
│  └────────────────────┘  │ - openai_model              │     │
│                           └────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Frontend — Hold-to-Talk State Machine

**Archivo:** `frontend/src/lib/trainerHold.ts`

La máquina de estados gestiona el ciclo de presión del botón de micrófono. Evita grabaciones duplicadas, race conditions con el permiso del micrófono, y grabaciones vacías.

### Estados

```typescript
type HoldState = {
  pointerId: number | null;      // ID del pointer activo (touch/mouse)
  startInFlight: boolean;        // true cuando se pidió getUserMedia
  recording: boolean;            // true cuando MediaRecorder está activo
  stopOnceStarted: boolean;      // true si el usuario soltó antes de que arrancara
};
```

### Transiciones

```
                          onHoldStart(pointerId)
  [idle] ─────────────────────────────────────────▶ [startInFlight]
    ▲                                                    │
    │                     onHoldEnd(pointerId)            │
    │            ┌────────────────────────────────────┐   │
    │            │ if recording → 'stop'              │   │
    │            │ if startInFlight → 'mark-pending'  │   │
    │            └────────────────────────────────────┘   │
    │                                                    ▼
    │                                              [stopOnceStarted]
    │                                                    │
    │              onRecordingReady()                     │
    │  ┌──────────────────────────────────────────────┐   │
    │  │ if stopOnceStarted → return 'stop-now'       │──┤
    │  │ else → return 'continue' (recording=true)    │  │
    │  └──────────────────────────────────────────────┘  │
    │                                                    ▼
    │                                              [recording]
    │                                                    │
    │              onRecordingStopped()                   │
    │  ┌──────────────────────────────────────────────┐   │
    │  │ reset all fields → back to [idle]            │──┘
    │  └──────────────────────────────────────────────┘
    │
    └──── onHoldStartFailed() (permiso denegado, error getUserMedia)
```

### Funciones clave

| Función | Descripción |
|---------|-------------|
| `createHoldState()` | Inicializa el estado en `{ pointerId: null, startInFlight: false, recording: false, stopOnceStarted: false }` |
| `isPrimaryPointer(e)` | Filtra: solo mouse button 0, o touch/pen |
| `onHoldStart(state, pointerId)` | Si ya hay un hold activo o grabando, retorna `'ignore'`. Sino, marca `startInFlight=true` y retorna `'start'` |
| `onHoldEnd(state, pointerId)` | Si el pointer no coincide, `'ignore'`. Si `startInFlight && !recording`, retorna `'mark-pending'` (soltó antes de tiempo). Si `recording`, retorna `'stop'` |
| `onRecordingReady(state)` |Marca `recording=true`. Si `stopOnceStarted` era true, retorna `'stop-now'` (el usuario soltó mientras se pedía el mic) |
| `onRecordingStopped(state)` | Reset completo a idle |
| `onHoldStartFailed(state)` | Reset completo a idle (error de permiso) |

### Permisos del Micrófono

```typescript
micGateAction(permission: MicPermissionState, alreadyGranted: boolean): MicGateAction
```

| permission | alreadyGranted | Resultado |
|------------|---------------|-----------|
| `'denied'` | `false` | `'deny'` — mostrar alerta |
| `true` | — | `'record'` — grabar directo |
| `'granted'` | `false` | `'record'` — grabar |
| `'prompt'` | `false` | `'prime'` — pedir permiso primero, no grabar aún |

El flujo `prime` (primera vez): se pide `getUserMedia`, se sueltan los tracks inmediatamente, se muestra "Micrófono listo", y el usuario debe volver a mantener presionado para grabar.

### Detección de MIME Type

```typescript
pickAudioMimeType(): string
```

Candidatos en orden de preferencia:
1. `audio/webm;codecs=opus` — Chrome/Edge
2. `audio/webm` — fallback Chrome
3. `audio/mp4` — Safari
4. `audio/m4a` — Safari alternativo
5. `audio/aac` — genérico

Usa `MediaRecorder.isTypeSupported()` para validar. Si ninguno es soportado, retorna `''` (el recorder usa el default del browser).

### Blob Vacío

```typescript
audioBlobLooksEmpty(blob: { size: number }): boolean
return blob.size < 256;
```

Si el blob tiene menos de 256 bytes, se considera vacío y se muestra un error al usuario sin llamar al backend.

---

## 4. Frontend — Grabación de Audio

**Archivo:** `frontend/src/views/Trainer.ts`

### Flujo de Grabación

```
pointerdown en micBtn
  │
  ├─ isPrimaryPointer(e)? ──No──▶ ignore
  │
  ├─ onHoldStart(holdState, pointerId) ──'ignore'──▶ ignore
  │
  ├─ setPointerCapture(pointerId)  ← captura el pointer en el botón
  │
  └─ handleStart()
       │
       ├─ queryMicPermission()
       │    └─ micGateAction(permission, micGranted)
       │         ├─ 'deny' → alert + onHoldStartFailed
       │         ├─ 'prime' → getUserMedia preview → onHoldStartFailed (espera re-press)
       │         └─ 'record' → continuar
       │
       ├─ getUserMedia({ audio: true })
       │    └─ currentStream = stream
       │
       ├─ pickAudioMimeType() → currentMimeType
       │
       ├─ new MediaRecorder(stream, { mimeType })
       │    ├─ ondataavailable → audioChunks.push(ev.data)
       │    └─ onstop → handle el audio blob
       │
       ├─ mediaRecorder.start(250)  ← timeslice 250ms
       │
       ├─ orb.setState('listening')
       │
       └─ beginInteractionClock()  ← arranca timer si no estaba activo
```

### Constante Importante

```typescript
MEDIA_RECORDER_TIMESLICE_MS = 250;
```

Cada 250ms `ondataavailable` se dispara con un chunk. Esto asegura que en Chrome/Windows los chunks se flushen correctamente antes de `stop()`. Sin timeslice, algunos drivers de audio de Windows devuelven un blob vacío al hacer `stop()`.

### Flujo de Release (pointerup / lostpointercapture / pointercancel)

```
pointerup / pointercancel / lostpointercapture
  │
  ├─ onHoldEnd(holdState, pointerId)
  │    ├─ 'ignore' → no hacer nada
  │    ├─ 'mark-pending' → stopOnceStarted = true (esperar a que arranque para parar)
  │    └─ 'stop' → handleStop()
  │
  ├─ releasePointerCapture(pointerId)
  │
  └─ handleStop()
       ├─ if mediaRecorder.state !== 'inactive':
       │    ├─ mediaRecorder.requestData()  ← flush final
       │    └─ mediaRecorder.stop()
       │
       └─ El flujo continúa en mediaRecorder.onstop (sección 5)
```

---

## 5. Frontend — Envío al Backend

**Archivo:** `frontend/src/views/Trainer.ts` (dentro de `mediaRecorder.onstop`)

Cuando `MediaRecorder` se detiene:

1. **Reset de estado:** `onRecordingStopped(holdState)` — vuelve a idle
2. **Parar tracks:** `stream.getTracks().forEach(t => t.stop())`
3. **Setear orb a processing:** `orb.setState('processing')`
4. **Crear audio blob:** `new Blob(audioChunks, { type: currentMimeType || 'audio/webm' })`
5. **Validar blob:** Si `audioBlobLooksEmpty(audioBlob)` → error "No se capturó audio"
6. **Mostrar temporal:** `addChatMessage('user', '🎤 Procesando audio...', tempId)`
7. **Preparar FormData:**
   ```typescript
   const formData = new FormData();
   const extension = currentMimeType.includes('mp4') || currentMimeType.includes('m4a') ? 'm4a' : 'webm';
   formData.append('audio', audioBlob, 'recording.' + extension);
   formData.append('user_name', store.currentUser?.email || 'Usuario');
   ```
8. **Enviar con timeout:** `AbortController` con 120,000ms (2 minutos)
9. **Endpoint:** `POST ${store.API_URL}/entrenar`
10. **Headers:** `Authorization: Bearer ${token}`

### Nota sobre Extensiones

Aunque el archivo se envía como `.webm` o `.m4a`, el backend guarda como `temp_{uuid}.wav`. Whisper detecta el formato por contenido, no por extensión, así que `.m4a` de iOS también transcribe correctamente.

---

## 6. Backend — Endpoint `/entrenar`

**Archivo:** `backend/routes/training_routes.py`

```
POST /entrenar
├─ Rate limit: 10/min, 100/hour
├─ Auth: JWT Bearer token → get_user_id(request)
├─ Body: FormData
│    ├─ audio (file, opcional)
│    ├─ text (string, opcional)
│    └─ user_name (string, default "Vendedor")
├─ Validación: requiere audio O text
├─ Validación: text ≤ 4000 caracteres (MAX_INPUT_LENGTH)
└─ Respuesta: { transcript, response_text, audio_url }
```

### Estructura del Endpoint

```python
@training_bp.route("/entrenar", methods=["POST"])
@limiter.limit("10 per minute, 100 per hour")
def entrenar():
    # 1. Auth
    user_id, token = get_user_id(request)  # JWT only
    
    # 2. Obtener perfil de usuario
    supabase_auth = get_authenticated_client(token)
    profile_resp = supabase_auth.table("profiles").select("*").eq("id", user_id).execute()
    user_profile = profile_resp.data[0]
    user_name = user_profile.get("email", user_name)
    
    # 3. Transcripción (si hay audio)
    if audio_file:
        temp_path = f"temp_{uuid.uuid4()}.wav"
        audio_file.save(temp_path)
        user_input = transcribe_audio(temp_path)
        # → is_hallucination check
        # → os.remove(temp_path) en finally
    
    # 4. Historial de conversación
    # → Buscar última conversación del usuario
    # → Obtener últimos 10 mensajes (ordenados cronológicamente)
    
    # 5. Assistant de empresa
    company_assistant_id = get_company_assistant_id(user_id)
    
    # 6. System prompt
    system_prompt = get_system_prompt(user_name, user_input, user_profile, assistant_id=company_assistant_id)
    
    # 7. LLM
    messages = [{"role": "system", "content": system_prompt}] + history + [{"role": "user", "content": user_input}]
    completion = client.chat.completions.create(model=openai_model, messages=messages, temperature=0.7)
    ai_response = completion.choices[0].message.content
    
    # 8. Seguridad de idioma
    lang = detect(ai_response)
    if lang != "es":
        # Regenerar en español
    
    # 9. TTS fixes
    tts_text = apply_tts_fixes(ai_response)
    
    # 10. Generar audio TTS
    audio_filename = f"response_{uuid.uuid4()}.mp3"
    generate_audio(tts_text, audio_full_path)
    audio_url = f"/audio/{audio_filename}"
    
    # 11. Guardar en Supabase
    # → Si no existe conversación, crear nueva
    # → Insertar mensajes user + assistant
    
    # 12. Respuesta
    return jsonify({
        "transcript": user_input,
        "response_text": ai_response,
        "audio_url": audio_url
    })
```

---

## 7. Backend — Transcripción (Whisper)

**Archivo:** `backend/services/openai_service.py`

```python
def transcribe_audio(audio_path):
    with open(audio_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language="es",        # Forzar español
            response_format="text",
            temperature=0.0       # Determinístico
        )
    return transcript
```

- **Modelo:** `whisper-1` (modelo de OpenAI)
- **Idioma:** forzado a español (`"es"`)
- **Temperatura:** `0.0` (salida determinística)
- **Formato de salida:** texto plano (no JSON con timestamps)
- **Input:** archivo temporal `.wav` (pero Whisper detecta formato por contenido)

---

## 8. Backend — Detección de Alucinaciones

**Archivo:** `backend/services/text_processing.py`

```python
_HALLUCINATION_MARKERS = ("amara.org", "subtítulos", "subtitulos")
_GRATITUDE_MARKERS = ("gracias.", "gracias por ver")

def is_hallucination(text: str) -> bool:
    clean = (text or "").strip().lower()
    if len(clean) < 2:
        return True
    if any(marker in clean for marker in _HALLUCINATION_MARKERS):
        return True
    if len(clean) < 25 and any(marker in clean for marker in _GRATITUDE_MARKERS):
        return True
    return False
```

### Casos detectados como alucinación

| Condición | Ejemplo |
|-----------|---------|
| Texto vacío o 1 carácter | `""`, `"a"` |
| Contiene `amara.org` | Whisper a veces inventa esta URL |
| Contiene `subtítulos` o `subtitulos` | Whisper confunde ruido con texto de subtítulos |
| Contiene `gracias.` o `gracias por ver` Y texto < 25 chars | Whisper inventa "gracias por ver" en audios vacíos |

Si se detecta alucinación → retorna 400 con `"No se detectó voz clara. Por favor, habla de nuevo."`

---

## 9. Backend — Historial y Contexto

**Archivo:** `backend/routes/training_routes.py`

```python
# 1. Buscar última conversación del usuario
conv_resp = supabase_auth.table("conversations") \
    .select("id") \
    .eq("user_id", user_id) \
    .order("created_at", desc=True) \
    .limit(1) \
    .execute()

# 2. Obtener últimos 10 mensajes de esa conversación
conversation_id = conv_resp.data[0]["id"]
msg_resp = supabase_auth.table("messages") \
    .select("role", "content") \
    .eq("conversation_id", conversation_id) \
    .order("created_at", desc=True) \
    .limit(10) \
    .execute()

# 3. Invertir para orden cronológico
for msg in reversed(msg_resp.data):
    history.append({"role": msg["role"], "content": msg["content"]})
```

### Estructura del historial

```python
messages = [
    {"role": "system", "content": system_prompt},   # System prompt generado
    # ... últimos 10 mensajes de la conversación anterior ...
    {"role": "user", "content": "usuario dijo X"},
    {"role": "assistant", "content": "IA respondió Y"},
    {"role": "user", "content": "usuario dijo Z"},
    {"role": "user", "content": user_input},         # Input actual
]
```

**Nota:** Se limita a 10 mensajes para controlar tokens. Si no hay conversación previa, solo se envía system prompt + input actual.

---

## 10. Backend — Perfil de Usuario y Assistant

### Perfil de Usuario

```python
profile_resp = supabase_auth.table("profiles").select("*").eq("id", user_id).execute()
user_profile = profile_resp.data[0]
# Campos usados:
#   user_profile["email"]       → nombre del usuario
#   user_profile["training_level"] → nivel de entrenamiento
#   user_profile["blockages"]   → bloqueos conocidos
```

Si no existe perfil → retorna 400 con `"Perfil de usuario no encontrado. Contacta al administrador."`

### Assistant de Empresa

```python
def get_company_assistant_id(user_id):
    # 1. Obtener company_id del perfil
    prof_resp = supabase.table("profiles").select("company_id").eq("id", user_id).execute()
    company_id = prof_resp.data[0]["company_id"]
    
    # 2. Obtener openai_assistant_id de la empresa
    comp_resp = supabase.table("companies").select("openai_assistant_id").eq("id", company_id).execute()
    return comp_resp.data[0]["openai_assistant_id"]
```

Cada empresa tiene su propio Assistant de OpenAI con documentación, políticas, y productos. El assistant se consulta siempre que existe `assistant_id` (general o específico), y se inyecta como contexto en el system prompt.

**Archivo:** `backend/routes/analysis_routes.py:12-26`

---

## 11. Backend — Clasificación de Intención

**Archivo:** `backend/services/prompt_service.py`

```python
_TEMAS_GENERALES = {
    "entrenar", "entrenamiento", "practicar", "practica", "práctica",
    "empezar", "comenzar", "inicio", "iniciar", "ayuda", "ayúdame",
    "ayudame", "quiero", "cómo", "como", "ejercicio", "simula",
    "simulación", "simular", "roleplay", "role play", "ventas", "vender",
    "cierre", "cerrar", "objeción", "objeciones", "prospecto",
}

_TEMAS_ESPECIFICOS = {
    "falabella", "seguros", "retail", "banco", "financiero", "finanzas",
    "producto", "póliza", "poliza", "prima", "cobertura", "deducible",
    # ... 40+ términos específicos de dominio
}

def clasificar_intencion(user_input: str) -> str:
    texto = user_input.lower().strip()
    palabras = set(texto.replace(",", " ").replace(".", " ").split())
    
    if palabras & _TEMAS_ESPECIFICOS:
        return "especifico"
    if palabras & _TEMAS_GENERALES:
        return "general"
    if len(texto) < 40:
        return "general"
    return "desconocido"
```

### Categorías

| Categoría | Condición | Ejemplo |
|-----------|-----------|---------|
| `general` | Palabras del set general O texto < 40 chars | "quiero practicar ventas" |
| `especifico` | Palabras del set específico | "cuál es la póliza de Falabella" |
| `desconocido` | Texto largo sin palabras clave | "¿cómo manejo un cliente que no responde a mis correos?" |

La clasificación determina el system prompt a usar (sección 12), pero **siempre** se consulta el Assistant de empresa si existe `assistant_id`.

---

## 12. Backend — Generación del System Prompt

**Archivo:** `backend/services/prompt_service.py`

### Antes del branching por intención (siempre se ejecuta)

```python
# 1. Consultar Assistant de empresa (si existe assistant_id)
if user_input and assistant_id:
    technical_info = get_assistant_knowledge(user_input, assistant_id=assistant_id)

# 2. Construir bloque de contexto
contexto_bloque = f"### Contexto relevante (base de conocimiento de la empresa):\n{technical_info}"
```

### Branch "general"

Prompt corto (~20 líneas):
- Identidad: "GRAVITY SYMBIOSIS™ 2.0"
- Reglas de memoria: "TÚ CONOCES AL USUARIO"
- Respuestas cortas: máximo 3-4 oraciones
- Si pregunta por productos → usar contexto del Assistant
- Tono: directo, motivador, sin adornos

### Branch "especifico/desconocido"

Prompt extendido (~25 líneas):
- Misma identidad
- Contexto técnico del Assistant integrado
- Respuestas concisas: máximo 5-6 oraciones
- Tono profesional, directo y motivador

---

## 13. Backend — Llamada a OpenAI (LLM)

**Archivo:** `backend/routes/training_routes.py`

```python
completion = client.chat.completions.create(
    model=openai_model,         # default: "gpt-5.4-mini" (env OPENAI_MODEL)
    messages=messages,           # [system + history + user]
    temperature=0.7
)
ai_response = completion.choices[0].message.content
```

### Parámetros

| Parámetro | Valor | Notas |
|-----------|-------|-------|
| `model` | `gpt-5.4-mini` | Configurable via `OPENAI_MODEL` env var |
| `messages` | Array | `[{system}] + history(≤10) + [{user}]` |
| `temperature` | `0.7` | Balance entre creatividad y consistencia |

---

## 14. Backend — Seguridad de Idioma

**Archivo:** `backend/routes/training_routes.py`

```python
from langdetect import detect

lang = detect(ai_response)
if lang != "es":
    ultra_spanish_prompt = (
        f"Eres GRAVITY SYMBIOSIS™ 2.0. Habla ÚNICAMENTE en español latino profesional. "
        f"No uses palabras en inglés. Responde ahora en español puro al usuario: {user_input}"
    )
    completion = client.chat.completions.create(
        model=openai_model,
        messages=[{"role": "system", "content": ultra_spanish_prompt}],
        temperature=0.5     # Más conservador
    )
    ai_response = completion.choices[0].message.content
```

**Problema que resuelve:** OpenAI a veces responde en inglés cuando el usuario habla en español. Se detecta con `langdetect` y se regenera con un prompt ultra-agresivo en español.

**Nota:** `langdetect` puede fallar (catch silencioso). Si falla, se asume español y se usa la respuesta original.

---

## 15. Backend — Correcciones TTS

**Archivo:** `backend/services/text_processing.py`

```python
_TTS_FIXES = {
    "CEO": "Director Ejecutivo",
    "ROI": "retorno de inversión",
    "leads": "prospectos",
    "feedback": "retroalimentación",
    "follow up": "seguimiento",
    "follow-up": "seguimiento",
    "OK": "entendido",
    "Okay": "entendido",
}

def apply_tts_fixes(text: str) -> str:
    result = text or ""
    for eng, esp in _TTS_FIXES.items():
        result = re.sub(re.escape(eng), esp, result, flags=re.IGNORECASE)
    return result
```

**Problema que resuelve:** La TTS de OpenAI pronuncia mal o suena raro con ciertos términos en inglés. Se reemplazan por equivalentes en español antes de enviar a TTS.

**Uso de `re.sub` con `re.IGNORECASE`:** Cubre variaciones como `"ceo"`, `"Ceo"`, `"OK"`, `"ok"`, etc.

---

## 16. Backend — Generación de Audio (TTS)

**Archivo:** `backend/services/openai_service.py`

```python
def generate_audio(text, output_path):
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    response = client.audio.speech.create(
        model="tts-1",
        voice="shimmer",
        speed=1.1,
        input=text
    )
    response.write_to_file(output_path)
    return output_path
```

### Parámetros

| Parámetro | Valor | Notas |
|-----------|-------|-------|
| `model` | `tts-1` | Modelo de TTS de OpenAI |
| `voice` | `shimmer` | Voz femenina, tono cálido y profesional |
| `speed` | `1.1` | 10% más rápido que natural (mejor fluidez) |

### Almacenamiento

```python
audio_dir = os.path.join(backend_dir, "assets", "audio")
audio_filename = f"response_{uuid.uuid4()}.mp3"
audio_full_path = os.path.join(audio_dir, audio_filename)
```

Los archivos se guardan en `backend/assets/audio/` con nombres únicos UUID. Se sirven vía el endpoint `/audio/<filename>`.

### Endpoint de Audio

```python
@training_bp.route("/audio/<filename>")
def serve_audio(filename):
    # Security: no path traversal
    if ".." in filename or filename.startswith("/"):
        return jsonify({"error": "Acceso no autorizado"}), 403
    
    audio_path = os.path.join(backend_dir, "assets", "audio", filename)
    return send_file(audio_path, mimetype="audio/mpeg")
```

---

## 17. Backend — Persistencia en Supabase

**Archivo:** `backend/routes/training_routes.py`

```python
# 1. Obtener o crear conversación
if not conversation_id:
    new_conv = supabase_auth.table("conversations").insert({"user_id": user_id}).execute()
    conversation_id = new_conv.data[0]["id"]

# 2. Insertar mensajes (user + assistant)
supabase_auth.table("messages").insert([
    {"conversation_id": conversation_id, "role": "user", "content": user_input},
    {"conversation_id": conversation_id, "role": "assistant", "content": ai_response}
]).execute()
```

### Tablas

| Tabla | Campos usados |
|-------|---------------|
| `conversations` | `id`, `user_id`, `created_at` |
| `messages` | `conversation_id`, `role`, `content`, `created_at` |

### Flujo

1. Se busca la última conversación del usuario
2. Si existe → se usan sus últimos 10 mensajes como historial
3. Si no existe → se crea una nueva conversación
4. Se insertan ambos mensajes (user + assistant) en la conversación
5. La próxima llamada a `/entrenar` usará estos mensajes como contexto

---

## 18. Backend — Respuesta al Frontend

```json
{
  "transcript": "texto transcrito del audio del usuario",
  "response_text": "respuesta generada por la IA",
  "audio_url": "/audio/response_{uuid}.mp3"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `transcript` | string | Texto transcrito por Whisper |
| `response_text` | string | Respuesta del LLM (texto para chat y fallback TTS) |
| `audio_url` | string | URL relativa del audio TTS generado |

**Nota:** `audio_url` puede ser `None` si falla la generación de audio. El frontend usa `response_text` como fallback (speakText con Web Speech API).

---

## 19. Frontend — Recepción y Reproducción

**Archivo:** `frontend/src/views/Trainer.ts`

### Flujo de Recepción

```
Response del backend
  │
  ├─ Si error → mostrar error en chat, orb idle
  │
  ├─ Actualizar mensaje temporal con transcript real
  │    └─ tempEl.querySelector('.msg-content').textContent = data.transcript
  │
  ├─ Si command_detected → orb.triggerCommandEffect(cmd)
  │
  ├─ Si audio_url:
  │    ├─ orb.setState('speaking')
  │    └─ playResponseAudio(url, onEnd → orb idle)
  │
  ├─ Si no audio_url pero sí response_text:
  │    ├─ orb.setState('speaking')
  │    └─ speakText(text, onEnd → orb idle)  ← Web Speech API fallback
  │
  └─ addChatMessage('assistant', data.response_text)
```

### Reproducción de Audio (Web Audio API)

```typescript
async function playResponseAudio(url: string, onEnd?: () => void) {
    // 1. Desbloquear AudioContext
    await unlockAudio();
    
    // 2. Fetch del audio
    const res = await fetch(url);
    const arrayBuf = await res.arrayBuffer();
    const audioBuf = await audioCtx.decodeAudioData(arrayBuf);
    
    // 3. Crear source y analyser
    const src = audioCtx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(analyser);
    analyser.connect(audioCtx.destination);
    
    // 4. Reproducir
    src.onended = () => { if (onEnd) onEnd(); };
    src.start(0);
    
    // 5. Iniciar visualizer de volumen
    startVolumeLoop();
}
```

### Fallback HTML Audio

Si Web Audio falla (decodificación, etc.):
```typescript
function fallbackHtmlAudio(url: string, onEnd?: () => void) {
    const audio = new Audio(url);
    audio.crossOrigin = 'anonymous';
    audio.playsInline = true;  // Importante para iOS
    audio.onended = () => { if (onEnd) onEnd(); };
    audio.play().catch(err => console.warn('Audio play failed:', err));
}
```

### Fallback Web Speech API

Si no hay `audio_url`:
```typescript
function speakText(text: string, onEnd?: () => void) {
    if (!window.speechSynthesis) { if (onEnd) onEnd(); return; }
    startFakeSpeakingVolume();  // Simula volumen para el orb
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.rate = 0.9;
    utterance.onend = () => { ... };
    window.speechSynthesis.speak(utterance);
}
```

---

## 20. Frontend — Visualización del Orb

**Archivo:** `frontend/src/views/Trainer.ts` (clase `ParticleOrb`)

### Orbe 3D de Partículas

El orb es un canvas HTML que renderiza 500 puntos distribuidos en una esfera 3D, rotados continuamente. La apariencia cambia según el estado.

### Estados del Orb

| Estado | Radio | Rotación (angleX, angleY) | Color | Glow | Pulsación |
|--------|-------|---------------------------|-------|------|-----------|
| `idle` | 110 | 0.003, 0.004 | `rgba(16,185,129,op)` | emerald-500/10, blur-3xl, opacity-30 | `sin(t*0.001)*5` |
| `listening` | 135 | 0.008, 0.012 | `rgba(52,211,153,op)` | emerald-400/20, blur-3xl, opacity-60, pulse | `audioVolume*60` |
| `processing` | 90 | 0.001, 0.002 | `rgba(167,243,208,op*0.8)` | emerald-200/10, blur-2xl, opacity-40, pulse | `sin(t*0.005)*2` |
| `speaking` | 145 | 0.005, 0.006 | `rgba(16,185,129,op)` | emerald-500/30, blur-3xl, opacity-70 | `audioVolume*60` |
| `ignite` | 180 | 0.02, 0.03 | — | orange-500/50, blur-3xl, opacity-90, pulse | — |
| `scan` | 110 | 0.001, 0.05 | — | cyan-400/40, blur-3xl, opacity-70 | — |

### Command Effects

```typescript
triggerCommandEffect(cmd: string) {
    const mapping = {
        '/ignite': 'ignite',
        '/deep-scan': 'scan',
        '/xray': 'scan',
        '/power-law': 'ignite',
        '/atomic': 'processing',
        '/mirror-client': 'listening'
    };
    // Cambia al estado mapeado por 3 segundos, luego vuelve a 'speaking'
}
```

### Animación

Cada frame:
1. Se aplica rotación en X e Y (más extraRotation cuando `audioVolume > 0`)
2. Se dibujan conexiones entre puntos cercanos (distancia < 0.4)
3. Se dibujan puntos con opacidad basada en la coordenada Z (profundidad)
4. La pulsación (`pulse`) se suma al radio base
5. Los puntos con `z > 0.5` tienen glow (`shadowBlur = 10`)

---

## 21. Frontend — Chat Drawer (Transcripción)

**Archivo:** `frontend/src/views/Trainer.ts`

```typescript
function addChatMessage(role: string, text: string, id?: string) {
    const container = document.getElementById('trainer-chat-container');
    
    if (role === 'assistant') {
        html = `<div class="mb-4 animate-in fade-in slide-in-from-left-2">
            <div class="text-[10px] text-primary uppercase tracking-wider font-bold">Gravity AI</div>
            <div class="text-gray-300 text-sm border-l-2 border-primary pl-3 msg-content">${text}</div>
        </div>`;
    } else if (role === 'user') {
        html = `<div class="mb-4 text-right animate-in fade-in slide-in-from-right-2">
            <div class="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">Tú</div>
            <div class="text-white text-sm bg-emerald-900/20 border border-emerald-500/10 rounded-lg p-3 inline-block msg-content">${text}</div>
        </div>`;
    } else {
        // Error
        html = `<div class="text-center text-xs text-red-400 my-2">${text}</div>`;
    }
}
```

### Mensajes Temporales

Cuando el usuario habla, se crea un mensaje temporal con id `user-msg-{timestamp}` y texto `🎤 Procesando audio...`. Cuando llega la respuesta del backend, se actualiza el contenido con el transcript real:

```typescript
tempEl.querySelector('.msg-content').textContent = data.transcript;
```

---

## 22. Frontend — Timer de Entrenamiento

**Archivo:** `frontend/src/app.ts`

### Variables

```typescript
let trainingInterval: number | null = null;
let totalTrainingSec = 0;
let currentInteractionStart: number | null = null;
let sessionStartedAt: string | null = null;
```

### Ciclo de Interacción

```
recordInteractionStart()          ← llamado por Trainer.ts cuando empieza a grabar
  ├─ if (!trainingInterval) startTrainingTimer()
  └─ currentInteractionStart = Date.now()

recordInteractionEnd()            ← llamado por Trainer.ts cuando termina de procesar
  ├─ totalTrainingSec += (now - currentInteractionStart)
  └─ currentInteractionStart = null
```

**Importante:** El timer NO corre continuamente. Solo cuenta cuando el usuario está activamente hablando/procesando. Si el usuario tiene la página abierta sin usar el micrófono, no se registra tiempo.

### Guardado de Sesión

```typescript
async function stopTrainingTimer() {
    // 1. Limpiar interval
    // 2. Acumular tiempo pendiente
    // 3. Guardar en Supabase
    if (totalTrainingSec > 0) {
        const durationSec = Math.max(60, totalTrainingSec); // Mínimo 60s
        await supaClient.saveSession({
            user_id: currentUser.id,
            started_at: sessionStartedAt,
            ended_at: new Date().toISOString(),
            duration_sec: durationSec
        });
    }
}
```

### Eventos que Detienen el Timer

1. **Navegar fuera del trainer:** `if (route.path !== '/entrenador') stopTrainingTimer()`
2. **Cerrar pestaña/navegador:** `window.addEventListener('pagehide', stopTrainingTimer)`
3. **Botón "Salir":** `finishSession()` → `stopTrainingTimer()`

### Display del Reloj

```typescript
function updateClockDisplay() {
    const current = currentInteractionStart ? Math.floor((Date.now() - currentInteractionStart) / 1000) : 0;
    const total = totalTrainingSec + current;
    clock.textContent = `${HH}:${MM}:${SS}`;
    if (total >= 60) { unlockAchievement('first_training'); }
}
```

Se actualiza cada segundo vía `setInterval(updateClockDisplay, 1000)`.

---

## 23. Frontend — Visualizador de Audio

**Archivo:** `frontend/src/views/Trainer.ts`

### Conexión del Audio al Analyser

```typescript
async function startAudioVisualizer(streamOrElement: MediaStream | HTMLAudioElement) {
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    if (streamOrElement instanceof MediaStream) {
        source = audioCtx.createMediaStreamSource(streamOrElement);
        source.connect(analyser);
        // No se conecta a destination (solo para visualización)
    } else {
        source = audioCtx.createMediaElementSource(streamOrElement);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);  // También suena
    }
    
    startVolumeLoop();
}
```

### Loop de Volumen

```typescript
function startVolumeLoop() {
    function updateVolume() {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) { sum += dataArray[i]; }
        const average = sum / dataArray.length;
        orb.audioVolume = average / 128;  // Normalizado 0-1
        
        if (orb.state === 'listening' || orb.state === 'speaking') {
            requestAnimationFrame(updateVolume);
        } else {
            orb.audioVolume = 0;
        }
    }
    updateVolume();
}
```

El `audioVolume` se usa en el orb para la pulsación y el `extraRotation`.

---

## 24. Seguridad y Rate Limiting

### Rate Limiting

**Archivo:** `backend/core/rate_limit.py`

```python
limiter = Limiter(
    key_func=_get_user_id_or_ip,  # USA JWT user_id, fallback a IP
    default_limits=[],
    storage_uri=os.environ.get("RATE_LIMIT_STORAGE", "memory://"),
    strategy="fixed-window",
)
```

| Endpoint | Límite |
|----------|--------|
| `POST /entrenar` | 10/min, 100/hour |
| `POST /generar_plan` | 5/min, 30/hour |
| `POST /analizar` | 10/min, 100/hour |
| `POST /copilot_analyze` | 20/min, 200/hour |

### Autenticación

```python
def get_user_id(request):
    auth_header = request.headers.get("Authorization")
    token = auth_header.split(" ")[1]
    user_resp = supabase.auth.get_user(token)
    return user_resp.user.id, token
```

**Solo acepta JWT.** No acepta query params `?user_id=` (eliminado por seguridad).

### Validaciones

| Validación | Detalle |
|------------|---------|
| Auth JWT | Requerido en todos los endpoints protegidos |
| Texto largo | `MAX_INPUT_LENGTH = 4000` caracteres |
| Audio vacío | `audioBlobLooksEmpty()` < 256 bytes |
| Alucinación | `is_hallucination()` detecta Whisper hallucinations |
| Path traversal | `serve_audio()` rechaza `..` y `/` al inicio |
| Perfil | Si no existe → 400 (no auto-creación) |

---

## 25. Configuración y Variables de Entorno

### Backend (`backend/core/config.py`)

| Variable | Default | Descripción |
|----------|---------|-------------|
| `OPENAI_API_KEY` | (requerido) | API key de OpenAI |
| `OPENAI_MODEL` | `gpt-5.4-mini` | Modelo LLM a usar |
| `SUPABASE_URL` | (requerido) | URL del proyecto Supabase |
| `SUPABASE_KEY` | (requerido) | Service role key de Supabase |
| `RATE_LIMIT_STORAGE` | `memory://` | Backend de rate limiting |

### Frontend

| Constante | Valor | Archivo |
|-----------|-------|---------|
| `MEDIA_RECORDER_TIMESLICE_MS` | 250 | `trainerHold.ts` |
| `MAX_INPUT_LENGTH` | 4000 | Backend config |
| `API_TIMEOUT` | 120,000ms | `Trainer.ts` (AbortController) |

---

## 26. Archivos Involucrados

### Frontend

| Archivo | Responsabilidad |
|---------|-----------------|
| `frontend/src/views/Trainer.ts` | Orquestador principal: grabación, envío, recepción, orb, chat, audio |
| `frontend/src/lib/trainerHold.ts` | Máquina de estados del hold-to-talk, MIME detection, validación de blobs |
| `frontend/src/app.ts` | Timer de entrenamiento, guardado de sesión, logros |
| `frontend/src/lib/simple_trainer.ts` | Código muerto (no se importa) |
| `frontend/index.html` | Markup del trainer, botones, canvas del orb |

### Backend

| Archivo | Responsabilidad |
|---------|-----------------|
| `backend/routes/training_routes.py` | Endpoint `/entrenar`, flujo completo de entrenamiento |
| `backend/routes/analysis_routes.py` | `get_company_assistant_id()`, endpoint `/analizar` |
| `backend/services/openai_service.py` | `transcribe_audio()`, `generate_audio()`, `get_assistant_knowledge()`, `analyze_objection()` |
| `backend/services/prompt_service.py` | `clasificar_intencion()`, `get_system_prompt()`, `generar_plan_entrenamiento()` |
| `backend/services/text_processing.py` | `is_hallucination()`, `apply_tts_fixes()` |
| `backend/core/config.py` | Clientes OpenAI y Supabase, `get_user_id()`, `get_user_role()` |
| `backend/core/rate_limit.py` | Rate limiting con Flask-Limiter |
| `backend/core/schemas.py` | Pydantic models de validación |

---

## 27. Diagrama de Flujo Completo

```
┌─ USUARIO ────────────────────────────────────────────────────────────┐
│                                                                      │
│  1. Mantiene presionado el botón de micrófono                        │
│     │                                                                │
│     ▼                                                                │
│  ┌─ FRONTEND ──────────────────────────────────────────────────┐     │
│  │                                                              │     │
│  │  pointerdown → onHoldStart() → getUserMedia()               │     │
│  │  → MediaRecorder.start(250ms timeslice)                     │     │
│  │  → orb.setState('listening')                                │     │
│  │  → beginInteractionClock()                                  │     │
│  │                                                              │     │
│  │  2. Usuario habla...                                        │     │
│  │     │                                                       │     │
│  │     ▼                                                       │     │
│  │  3. Usuario suelta el botón                                 │     │
│  │     │                                                       │     │
│  │     ▼                                                       │     │
│  │  pointerup → onHoldEnd() → handleStop()                     │     │
│  │  → mediaRecorder.stop()                                     │     │
│  │                                                              │     │
│  │  4. mediaRecorder.onstop:                                   │     │
│  │     ├─ onRecordingStopped(holdState)                        │     │
│  │     ├─ stream.getTracks().forEach(t => t.stop())            │     │
│  │     ├─ orb.setState('processing')                           │     │
│  │     ├─ new Blob(audioChunks) → audioBlob                    │     │
│  │     ├─ audioBlobLooksEmpty? → error si < 256 bytes         │     │
│  │     ├─ addChatMessage('user', '🎤 Procesando audio...')     │     │
│  │     │                                                       │     │
│  │     ▼                                                       │     │
│  │  5. POST /entrenar (FormData: audio + user_name)            │     │
│  │     │                                                       │     │
│  └─────┼───────────────────────────────────────────────────────┘     │
│        │                                                             │
│        ▼                                                             │
│  ┌─ BACKEND ───────────────────────────────────────────────────┐     │
│  │                                                              │     │
│  │  6. Auth JWT → user_id                                      │     │
│  │  7. Perfil de usuario (profiles table)                      │     │
│  │  8. transcribe_audio() → Whisper (whisper-1, lang="es")     │     │
│  │  9. is_hallucination()? → 400 si detectado                  │     │
│  │ 10. Historial: últimos 10 mensajes de conversations          │     │
│  │ 11. get_company_assistant_id() → Assistant de empresa       │     │
│  │ 12. clasificar_intencion() → general/especifico/desconocido │     │
│  │ 13. get_system_prompt() → system prompt + contexto Assistant│     │
│  │ 14. LLM: GPT-5.4-mini, temp=0.7                            │     │
│  │ 15. langdetect: si no es español → regenerar                │     │
│  │ 16. apply_tts_fixes() → reemplazar términos inglés          │     │
│  │ 17. generate_audio() → OpenAI TTS (shimmer, 1.1x)          │     │
│  │ 18. Guardar mensajes en Supabase                            │     │
│  │ 19. Retornar { transcript, response_text, audio_url }       │     │
│  │                                                              │     │
│  └─────┼───────────────────────────────────────────────────────┘     │
│        │                                                             │
│        ▼                                                             │
│  ┌─ FRONTEND ──────────────────────────────────────────────────┐     │
│  │                                                              │     │
│  │ 20. Actualizar msg temporal con transcript real              │     │
│  │ 21. playResponseAudio(audio_url)                            │     │
│  │     ├─ Web Audio API: fetch → decode → play                 │     │
│  │     ├─ Fallback: HTMLAudioElement                           │     │
│  │     └─ Fallback: Web Speech API (speakText)                 │     │
│  │ 22. orb.setState('speaking')                                │     │
│  │ 23. addChatMessage('assistant', response_text)              │     │
│  │ 24. Al terminar audio → orb.setState('idle')                │     │
│  │ 25. endInteractionClock()                                   │     │
│  │                                                              │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  26. Repetir desde paso 1 (ciclo siguiente)                         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

*Documento generado el 2026-09-15. Cubre el flujo completo del Trainer desde hold-to-talk hasta reproducción de audio.*
