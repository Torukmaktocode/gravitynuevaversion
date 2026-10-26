# Closer Elite — Cómo funciona (Frontend + Backend + Diseño)

> Documento de referencia del módulo **Closer Elite** (`/closer`): flujo end-to-end, lógica de frontend, endpoint de backend, motor de IA, persistencia de scoring y sistema visual (Gemini-style, temas claro/oscuro).
> Última actualización: 2026-10-13.

---

## Índice

1. [Resumen](#1-resumen)
2. [Flujo end-to-end](#2-flujo-end-to-end)
3. [Frontend — interacción (`Closer.ts`)](#3-frontend--interacción-closerts)
4. [Backend — endpoint `/analizar`](#4-backend--endpoint-analizar)
5. [Motor de IA (`analyze_objection`)](#5-motor-de-ia-analyze_objection)
6. [Renderizado de la respuesta](#6-renderizado-de-la-respuesta)
7. [Scoring y persistencia](#7-scoring-y-persistencia)
8. [Diseño y CSS](#8-diseño-y-css)
9. [Modo lab](#9-modo-lab)
10. [Archivos involucrados](#10-archivos-involucrados)

---

## 1. Resumen

El Closer es un "escáner de objeciones": el usuario escribe la objeción real de un cliente (ej. *"es muy caro"*), la IA la analiza en 4 dimensiones (lógica, emoción, identidad, contexto) y devuelve un **playbook táctico completo**: respuesta corta (2 líneas), respuesta profesional (4 líneas), estrategias con guiones hablados, "Frase Killer" personalizada y preguntas calibradas estilo Chris Voss.

| Capa | Tecnología | Archivo principal |
|---|---|---|
| Vista | Vanilla TS + HTML estático | `frontend/src/views/Closer.ts` |
| Estilos | CSS puro (`main.css` + `openai-theme.css`) | clases `.closer-*` |
| API | Flask + rate limit | `backend/routes/analysis_routes.py` |
| IA | OpenAI Chat (`json_object`) + Assistant por empresa | `backend/services/openai_service.py` |
| Datos | Supabase (closer_usage → daily_metrics) | `frontend/src/api/supa-client.ts` |

---

## 2. Flujo end-to-end

```
Usuario escribe objeción + Enter
        │
        ▼
[Frontend] burbuja del usuario (stream-in-top) + composer baja al fondo (animación WAAPI 300ms)
        │
        ├── modo lab (/lab)  → mock local tras 1100ms (sin red, sin Supabase)
        │
        └── modo real
                ▼
        POST /analizar { objecion }  (timeout 120s, abortable con botón Detener)
                │
        [Backend] JWT → get_user_id() → perfil → company_id → companies.openai_assistant_id
                │
                ├── 1. Assistant feedback: thread efímero con los documentos de la empresa
                │
                └── 2. GPT (openai_model) con prompt de 5 pasos → JSON estricto
                        │
        ◄── JSON { tipo_objecion, respuesta_corta/media, preguntas_calibradas,
        │          análisis_4d, playbook { paso1..paso4, frase_killer } }
        │
[Frontend] el indicador "Analizando..." se MORPHiza en la respuesta
        │   └── staggerReveal(): bloques entran en cascada (80ms c/u, tope 800ms)
        │
        └── saveCloserUsage() → closer_usage + daily_metrics (+30s por consulta)
```

**1 consulta al Closer = 30 segundos de minutos registrados** (regla de scoring del proyecto).

---

## 3. Frontend — interacción (`Closer.ts`)

### 3.1 Composer
- `#client-input` (textarea) con auto-resize (autoResize, tope 160px).
- **Placeholders rotativos** (`startPhraseRotation`): 6 frases ejemplo ("Ej: No tengo presupuesto este mes"...) que rotan cada 2.6s con fade de opacidad 220ms. Se detienen en cuanto el usuario escribe algo.
- **Cursor sintético** (`#closer-cursor`): parpadeo custom visible solo con input vacío, posicionado a 22px.
- **Enter envía** (Enter sin Shift = submit; Shift+Enter = salto de línea). Envío por botón `#analyze-button`.

### 3.2 Estados del botón (estilo Gemini)
- El mismo botón alterna **enviar (flecha)** ↔ **detener (cuadrado)** vía `is-loading` + `innerHTML` swap.
- `stopGeneration()`: aborta el fetch (`AbortController`), resetea el botón y elimina el indicador de carga. En modo lab también cancela el timeout del mock.
- Timeout duro: 120s (`setTimeout(() => controller.abort(), 120000)`).

### 3.3 Secuencia visual al enviar
1. Burbuja usuario entra con `stream-in-top`; input se limpia.
2. `#view-closer` recibe `.closer-sent`: el header/título se desvanece (opacity + translateY/scale, `cubic-bezier(0.22,1,0.36,1)`, header colapsa su margin-top) y el composer **se desliza al fondo** midiendo el rect antes/después y animando con Web Animations API (300ms).
3. Aparece el indicador `.closer-thinking` (3 puntos con gradiente violeta de 8px, sin avatar ni texto).
4. Al llegar la respuesta: el bubble del indicador se **reemplaza en sitio** (`.closer-replaced`) — nunca parpadea ni desaparece.

### 3.4 Manejo de errores
- HTTP no-ok → `alert('Error: ...')` + el indicador se elimina.
- AbortError (stop o timeout silencioso) → no alerta.
- En error el composer **no** sale del modo conversación `.closer-sent`.

---

## 4. Backend — endpoint `/analizar`

`backend/routes/analysis_routes.py:77-91`

| Aspecto | Detalle |
|---|---|
| Ruta | `POST /analizar` |
| Rate limit | **10/min, 100/hora** (`limiter.limit`) |
| Auth | `get_user_id(request)` — **solo JWT** (no acepta `?user_id=`, fix de seguridad 2026-07-15) |
| Validación | `AnalyzeRequest` (Pydantic) → 400 si el body es inválido |
| Personalización | `get_company_assistant_id(user_id)`: `profiles.company_id` → `companies.openai_assistant_id`. Sin empresa/Assistant → análisis genérico (sin contexto) |
| Error | 500 con `{"error": ...}` |

Existe también `POST /copilot_analyze` (en la misma blueprint, 20/min) para **SHADOW/Copilot** — no confundir con el Closer.

---

## 5. Motor de IA (`analyze_objection`)

`backend/services/openai_service.py:49-159`

### 5.1 Contexto de la empresa (opcional)
Si hay `assistant_id`, primero consulta el **Assistant de OpenAI** (base de conocimiento de la empresa):
1. Crea un thread efímero `beta.threads.create()`.
2. Pregunta: *"Analiza esta objeción e identifica si existe alguna directriz, producto, servicio o técnica específica en nuestros documentos para rebatirla: {objecion}"*.
3. `create_and_poll` → si `completed`, extrae el primer mensaje de respuesta.
4. En `finally` **elimina el thread** (evita fuga de recursos — fix 2026-07-15).
5. Cualquier fallo degrada a `"Error recuperando conocimiento técnico."` sin romper el análisis.

### 5.2 Prompt principal (5 pasos) → GPT con `json_object`
| Paso | Qué genera |
|---|---|
| 1. Análisis 4D | `analisis_4d: {logica, emocion, identidad, contexto}` |
| 2. Playbook táctico | paso1 `empatia` (Voss) + `redireccion` (Belfort); paso2 `tecnica1` (Cialdini) + `tecnica2` (Leyes del Poder); paso3 `proxima_jugada` (anticipación) |
| 3. Frase Killer | única y personalizada a la objeción; estilo según tipo: **Precio**→valor/inversión, **Tiempo**→anti-postergación, **Confianza**→emocional calibrada, **Estatus**→exclusividad; máx 200 chars |
| 4. Respuestas | `respuesta_corta` (2 líneas, ≤30 palabras) y `respuesta_media` (4 líneas, ≤50 palabras), pronunciables en voz alta |
| 5. Preguntas calibradas | 3 preguntas Voss (3-6 palabras, sin "por qué") |

**Parámetros de la llamada:** `model = openai_model` (env `OPENAI_MODEL`, defecto `gpt-5.4-mini`), `temperature 0.85`, `max_completion_tokens 2000`, `response_format {"type":"json_object"}`. El contenido vacío lanza `ValueError` (→ 500).

### 5.3 JSON de salida
```
tipo_objecion, sentimiento_cliente, arquetipo_cliente, nivel_confianza,
probabilidad_cierre (1-100), respuesta_corta, respuesta_media,
preguntas_calibradas[3], analisis_4d{...}, playbook{paso1..paso4{frase_killer}}
```

> Nota: el frontend lee `arquetipo`/`confianza` en el mock del lab y `playbook.paso4.frase_killer` + `preguntas_calibradas` + `respuesta_corta/media` en producción.

---

## 6. Renderizado de la respuesta

`Closer.ts` → `renderPlaybook(data)` construye el HTML del bloque `.closer-analysis`:

| Sección | Clases CSS | Fuente de datos |
|---|---|---|
| Introducción contextual | `.closer-conv-p` | texto fijo del módulo |
| Respuesta rápida · 2 líneas | `.closer-version-short` | `respuesta_corta` |
| Respuesta profesional · 4 líneas | `.closer-version-full` | `respuesta_media` |
| ESTRATEGIAS PROFESIONALES | `.closer-strategy` + `.closer-script` | contenido fijo del renderPlaybook (4 estrategias: empatizar/aislar, costo de inacción, "Sentía-Sintieron-Descubrieron", divide y minimiza) |
| FRASE KILLER | `.closer-script-killer` | `playbook.paso4.frase_killer` (condicional — solo si viene) |
| PREGUNTAS CALIBRADAS | `.closer-calibrated-item` | `preguntas_calibradas` |
| Cierre conversacional | `.closer-conv-closing` | texto fijo (pide contexto del producto) |

- `md()` — mini renderizador de Markdown: solo `**negritas**` y `*itálicas*`, con escape previo de `& < >`.
- `escapeHtml()` protege la burbuja del usuario contra XSS.
- `staggerReveal()` aplica `.closer-reveal` a los bloques con delay incremental (`i*80ms`, tope 800ms).
- Scroll al morph y un segundo scroll a los 1100ms para asegurar el último bloque.

---

## 7. Scoring y persistencia

Tras una respuesta exitosa (solo modo real, no lab):

```ts
supaClient.saveCloserUsage({ user_id, framework: 'CloserElite', technique: 'Analysis', score: 85 })
```

- `saveCloserUsage()` (supa-client.ts) → INSERT en `closer_usage` + RPC `sync_daily_metrics_on_closer` (trigger) → `daily_metrics.closer_count += 1` y `total_minutes += FLOOR(closer_count * 0.5)`.
- Los fallos de persistencia se ignoran silenciosamente (`.catch(() => {})`) — el análisis no se pierde por error de red en Supabase.
- Regla del proyecto: **1 consulta = 30s**; `Math.floor`, nunca `Math.round` (ver AGENTS.md → Fórmulas de visualización).
- El progreso guardado alimenta misiones diarias (ej. 20 análisis/día), logros (`.closer_novice` = 5 análisis) y ranking semanal.

---

## 8. Diseño y CSS

Todo el look es **estilo Gemini** (2026-09-25), en dos temas: oscuro (base `main.css`) y claro (overrides `html.theme-openai` en `openai-theme.css`).

### 8.1 Estructura visual
- **Chat único**: burbujas de usuario con avatar "TÚ" gradiente violeta; respuestas como bloques planos por separador, no burbujas pesadas.
- **Composer**: pill centrado (`max-width 42rem`) anclado sticky bottom vía `:has(#closer-chat ...)`; sin caja sólida — el desvanecido lo da `.closer-chat-fade` (disolución de 72px que coincide en opacidad 0.6 con el fondo del composer para un degradado continuo sin cortes).
- **Glow inferior**: gradiente violeta desde el fondo (vertical: `#view-closer::before` con linear+radiales; horizontal: radial superior + glow amplio + acentos de esquina). Se desvanece con `transition: opacity .6s` al responder (`:has(.closer-analysis)` / `.closer-sent`).
- **Tarjetas planas**: `.closer-analysis`, `.closer-script`, `.closer-version`, `.closer-calibrated-item` sin sombras pesadas ni fondos — solo borde lateral violeta de 2px (izquierda) y línea centrada de 1px en `.closer-analysis`.
- **Títulos de playbook** (ESTRATEGIAS / FRASE / PREGUNTAS): `13px`, `tracking 0.14em`, dos tonos (violeta + neutro).
- **Números de estrategia**: inline sin caja (`.closer-strategy::before`).
- **Divisores** (`.closer-divider`): gris neutro sutil.

### 8.2 Animaciones
| Animación | Valores |
|---|---|
| `stream-in-top` | entrada de mensajes (fade+slide) 280ms |
| Header fade al enviar | 250ms (`closer-sent`) |
| Composer drop al fondo | WAAPI 300ms `cubic-bezier(0.22,1,0.36,1)` |
| Empty state fade out | 220ms (`.closer-empty-leaving`, timeout 280ms) |
| Morph indicador → respuesta | 250ms (`.closer-replaced`) |
| `staggerReveal` | 80ms por bloque, tope 800ms |
| Pill del input | solo `transition-[border-color,box-shadow] 150ms` — **no anima el alto** del textarea |

### 8.3 Responsive y temas
- **Vertical móvil**: `min-height: calc(100dvh - var(--topbar-height))` (dvh evita overflow del 100vh con barra del navegador); columnas del calendario/grid con `min-w-0`; composer full-width con fondo condicional (solo con `.closer-analysis` presente).
- **Horizontal**: composer full-width tras `.closer-sent` para fundir el texto que pasa por detrás.
- **Tema claro** (`openai-theme.css`): `.closer-chat-fade` blanco, `closer-input` opaco blanco, glow reducido (0.34→0.16 vs 0.42→0.20 en oscuro).
- **Accesibilidad**: `prefers-reduced-motion` desactiva `.closer-reveal`, `.closer-replaced` y el empty state.

---

## 9. Modo lab

`/lab/closer-elite` (ruta registrada en el router) reutiliza la misma vista con sessionStorage mock:

- Detección: `store.currentUser?.id === 'lab-user-001'` o path `/lab`.
- Simula 1100ms de latencia y devuelve un **mock completo** (objeción "Precio", probabilidad 72%, playbook con frase killer basada en el texto escrito).
- **No llama a `/analizar`, no gasta rate limit, no registra `closer_usage`** ni toca Supabase.
- Sirve para probar el diseño (temas claro/oscuro, responsive, animaciones) sin permisos ni backend abierto.

---

## 10. Archivos involucrados

| Archivo | Rol |
|---|---|
| `frontend/index.html` | Vista estática `#view-closer`, composer, modales |
| `frontend/src/views/Closer.ts` | Toda la lógica de interacción y render |
| `frontend/src/main.css` | Base oscura `.closer-*`, animaciones, responsive |
| `frontend/src/openai-theme.css` | Overrides del tema claro (`html.theme-openai .closer-*`) |
| `frontend/src/router.ts` | Ruta `/closer` y `/lab/closer-elite` |
| `frontend/src/api/supa-client.ts` | `saveCloserUsage()`, scoring |
| `backend/routes/analysis_routes.py` | `POST /analizar` (+ rate limit, JWT, assistant por empresa) |
| `backend/services/openai_service.py` | `analyze_objection()` + `get_assistant_knowledge()` |
| `backend/core/config.py` | `openai_model` (env), `limiter`, Supabase client |
| `backend/core/rate_limit.py` | Límites 10/min 100/hora |

**Verificación sugerida:**
```bash
cd frontend && npm run typecheck && npx eslint src/views/Closer.ts
cd frontend && npm run dev      # /closer (real) · /lab/closer-elite (mock)
cd backend && .venv/bin/python -m pytest tests/test_openai_service.py tests/test_prompt_service.py -v
```
