# Cambios Frontend & Backend — Documentación Súper Detallada

> **Laboratorio Gravity** — clon `/lab` sin permisos + rediseño completo a **morado neón #8b5cf6** + **OpenAI White + Glassmorphism + Plus Jakarta Sans**. Todo documentado por archivo, línea y motivo. No se tocó el flujo productivo real (`/login`, `/dashboard` siguen con whitelist).

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Backend — cambios](#2-backend--cambios)
3. [Frontend — tema y paleta](#3-frontend--tema-y-paleta)
4. [Frontend — laboratorio /lab](#4-frontend--laboratorio-lab)
5. [Frontend — entrenador (esfera, verse, distribución)](#5-frontend--entrenador-esfera-verse-distribución)
6. [Frontend — closer (look Gemini morado)](#6-frontend--closer-look-gemini-morado)
7. [Frontend — sidebar, menú y toggles](#7-frontend--sidebar-menú-y-toggles)
8. [Frontend — transcripción y bienestar](#8-frontend--transcripción-y-bienestar)
9. [Frontend — UX/UI Pro Max](#9-frontend--uxui-pro-max)
10. [Archivos y verificación](#10-archivos-y-verificación)
11. [Tema claro por defecto + login lab en claro (2026-10-13)](#11-tema-claro-por-defecto--login-lab-en-claro-2026-10-13)

---

## 1. Resumen ejecutivo

| Qué | Antes | Después | Por qué |
|-----|-------|---------|---------|
| Acento | Verde neón `#2ccd70` / teal `#10a37f` | **Morado neón `#8b5cf6`** `hsl 258 89% 66%`, hover `#7c3aed`/`#6d28d9` | Pedido explícito: todo morado en dark y white |
| Fondo claro | No existía (solo dark) | **OpenAI White** `#ffffff` + `#fafafa`/`#f5f5f5` + `Glassmorphism` | Inspiración `openai.com/brand` + skill `ui-ux-pro-max` |
| Tipografía | `Syne`/`Bebas Neue`/`Inter` mixto | **`Plus Jakarta Sans`** 400-800 + `Inter` fallback, 16px 1.65 lh, tracking -0.011em | Skill SaaS friendly modern |
| Esfera | Emerald `rgba(16,185,129` | **Violet** `rgba(139,92,246` / `167,139,250` / `221,214,254` + verse degradado | Coherencia morado |
| Closer | `bg-secondary/30` grid oscuro | **Gemini pill** blanco `rounded-full` + fondo radial morado `opacity 0.45` | Look Gemini morado, no azul |
| Laboratorio | No existía | **`/lab` y `/lab/*`** sin auth, mock data | Probar diseño sin Supabase/whitelist |

**Builds:** `main-*.css` 67→76KB, `main-*.js` 411→419KB, 73 módulos, `✓ built` sin errores.

---

## 2. Backend — cambios

### 2.1 `backend/services/openai_service.py:162-179`

**Voz:**
```python
# Antes
model="tts-1", voice="shimmer"
# Después (pedido marin → revertido a shimmer por confirmación)
model="tts-1", voice="shimmer"  # se probó "marin" + "gpt-4o-mini-tts", se dejó shimmer
# Intermedio documentado:
model="gpt-4o-mini-tts", voice="marin"  # para marin (requiere modelo nuevo)
```

**Motivo:** voz del entrenador. Se deja `shimmer`/`tts-1` como estable.

### 2.2 `backend/core/config.py:13-19`

```python
# Antes
client = OpenAI(api_key=api_key)
# Después
org_id = os.getenv("OPENAI_ORG_ID") or os.getenv("OPENAI_ORG") or os.getenv("OPENAI_ORGANIZATION")
if org_id:
    client = OpenAI(api_key=api_key, organization=org_id)
    logger.info(f"OpenAI org configurada: {org_id[:12]}...")
else:
    client = OpenAI(api_key=api_key)
```

**Motivo:** soportar `org-e87JhiEcZRSWcGPUhnSgUggX` sin hardcode.

### 2.3 `.env` (raíz) y `backend/.env` (no commiteados, `.gitignore`)

Añadidos (valores reales no se loguean):
```
OPENAI_API_KEY=sk-proj-fx9q... (72+ chars)
OPENAI_ORG_ID=org-e87JhiEcZRSWcGPUhnSgUggX
OPENAI_MODEL=gpt-5.4-mini
SUPABASE_URL=https://nqaiuixiryqlcszikwgb.supabase.co
SUPABASE_KEY=eyJ... (anon, usado también como VITE_*)
VITE_SUPABASE_URL / VITE_SUPABASE_KEY (para Vite envDir=..)
PORT=5001
```
**Verificación:** `python -c "from core.config import client; print(bool(client))"` → `True`, `GET /health` → `{"status":"healthy"}`.

### 2.4 `backend/test_server.py` (nuevo, ~120 líneas, no reemplaza `app.py`)

Mock Flask para UI sin claves reales (`python test_server.py` en `5001`):
- `GET /`, `/health`
- `POST /auth/v1/token`, `/auth/v1/signup`, `GET /auth/v1/user` → `MOCK_USER lab-user-001`
- `GET /rest/v1/email_whitelist` → `[{email}]` (whitelist abierta)
- `GET /rest/v1/profiles|conversations|messages|daily_metrics|companies|invitations`
- `POST /entrenar`, `/analizar` (mock), `GET /conocimiento/modulos`

**Uso:** `cd backend; python test_server.py` para probar lab sin `OPENAI_API_KEY`. Para voz real: `python app.py`.

### 2.5 Otros backend
- `requirements.txt` instalado (385 packages, `pip install -r` OK)
- `app.py:22-28` CORS ya permitía `localhost:5173`, no se tocó.

---

## 3. Frontend — tema y paleta

### 3.1 `frontend/src/dashboard.css:1-31`

```css
/* Antes */
--foreground: 145 60% 90%; /* emerald light */
--primary: 145 63% 49%; /* #2ecc70 */
--border: 145 63% 20%;
--input: 145 63% 10%;
--ring: 145 63% 49%;

/* Después — morado neón */
--foreground: 270 15% 92%; /* lavanda */
--primary: 258 89% 66%; /* #8b5cf6 */
--border: 258 45% 22%;
--input: 258 45% 14%;
--ring: 258 89% 66%;
/* + import Plus Jakarta Sans */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
body { font-family: 'Plus Jakarta Sans','Inter',system-ui,sans-serif; }
```

### 3.2 `frontend/src/main.css:1-12`

```css
/* Antes */
--plasma: #2ccd70; --fire: #28D20F; --gold: #00FF66;
--grid: rgba(44,205,112,0.06); --glow-c: rgba(44,205,112,0.18);
/* Después */
--plasma: #8b5cf6; --fire: #7c3aed; --gold: #a78bfa;
--grid: rgba(139,92,246,0.06); --glow-c: rgba(139,92,246,0.18);
--glow-f: rgba(124,58,237,0.18);
body { font-family: 'Plus Jakarta Sans','Inter',system-ui,sans-serif; }
```

### 3.3 `frontend/src/openai-theme.css` (nuevo, 350+ líneas)

Creado desde cero, importado en `app.ts:2` (`import './openai-theme.css'`).

**Tokens:**
```css
html.theme-openai {
  --void: #ffffff; --deep: #fafafa; --plasma: #8b5cf6; --fire: #6d28d9;
  --background: 0 0% 100%; --foreground: 0 0% 5%; --card: 0 0% 100%;
  --primary: 258 89% 66%; --secondary: 0 0% 96%; --muted: 0 0% 96%;
  --muted-foreground: 0 0% 43%; --border: 0 0% 90%; --ring: 258 89% 66%; --radius: 12px;
}
```

**Tipografía:** `Inter` → `Plus Jakarta Sans` (skill) en *todo* (`body,h1-h4,p,a,button,input,label,span,div`), 16px 1.65 lh, tracking -0.011em, display `Inter 700 → Jakarta 800 -0.03em`.

**Landing:** `nav` `rgba(255,255,255,0.86)` + hairline `#e5e5e5`, `nav-cta` `bg #0d0d0d` pill, `hero-title` `Inter 800 -0.03em` (antes `Bebas Neue` neón), `cards` `bg #ffffff border #e5e5e5 shadow none` + hover `border #0d0d0d translateY(-2px)`, `btn` `rounded 9999px clip-path:none`.

**Barrido global morado:** `#10a37f`→`#8b5cf6`, `#0a7a5e`→`#6d28d9`, `164 84% 32%`→`258 89% 66%`, `rgba(16,163,127`→`rgba(139,92,246`, `bg-emerald`→`bg-violet` en landing.

**Glassmorphism (skill):** `.card/.sidebar/.topbar` `backdrop-filter: blur(16px) saturate(1.15)` + `rgba(255,255,255,0.82)` + `inset 0 1px 0 rgba(255,255,255,0.8)`, `cursor-pointer`, `transition 200ms`, `focus-visible` `outline 2px solid #8b5cf6`, `prefers-reduced-motion` reduce.

**Closer entrada:** `@keyframes closerBgFade` + `closerUpFade` con `translateY(16px)`, `#view-closer:not(.hidden) #closer-*` con delays 80/120/260/380ms.

**Trainer header fix blanco:** `#training-phase-name` `#5b21b6`, `#performance-score/#training-progress-val` `#4b5563`, `.h-1` `bg #f3f4f6 border #e5e7eb`, `#training-progress-bar` `#7c3aed`.

**Playbook legible:** `.bg-secondary/10,20` → `bg #ffffff border #e5e7eb`, `.text-white` → `#0d0d0d`, `.text-gray-300` → `#374151`, `.bg-primary/5` → `#f5f3ff`.

**Logo legible:** `.nav-logo .logo-main/.logo-sub` y `.sidebar-header span` → `#0d0d0d`, `.text-primary` en header → `#8b5cf6`.

**Verse:** `#orb-verse` `opacity 0.32` en white (0.60 en dark), `#orb-verse-soft` `0.16`.

### 3.4 Barrido verde → morado en todo `src` (script Python)

```
#2ccd70 → #8b5cf6, #28D20F → #7c3aed, #00ff88 → #8b5cf6, #00FF66 → #a78bfa,
44,205,112 → 139,92,246, 16,185,129 → 139,92,246, 52,211,153 → 167,139,250,
0,255,102 → 139,92,246, bg-green-* → bg-violet-* etc. en 8 archivos:
- app.ts (partículas), dashboard.css (--green vars), main.css (grid/glow),
- features/admin-data.ts, lib/utils.ts, views/AdminMetrics.ts, views/Copilot.ts, views/Trainer.ts, index.html (Wellness, Closer)
```
Verificado `Select-String green` → solo `var(--green)` con valor morado, 0 `bg-green`.

---

## 4. Frontend — laboratorio /lab

### 4.1 `frontend/src/views/TestLab.ts` (nuevo, 45 líneas)

Mock user/profile para bypass:
```ts
MOCK_USER = { id:'lab-user-001', email:'tester@lab.local' }
MOCK_PROFILE = { id:'lab-user-001', role:'user', company_id:null, nickname:'Tester Lab' }
isLabPath(path) // /lab* true
getLabView(path) // mapea /lab/entrenador → view-trainer
enterLab(router) // store.currentUser = MOCK + navigate /lab/dashboard
setupTestLogin(router) // botón #test-login-enter
```

### 4.2 `frontend/index.html:648-672`

Añadido `section#view-test-login` clon visual del login con badge `MODO LAB` ámbar, sin validación, botón `ENTRAR AL LABORATORIO →` + `Volver al inicio real`, y `div#lab-banner` sticky ámbar con `◐ OpenAI White` toggle.

### 4.3 `frontend/src/lib/router.ts:169-180`

```ts
router.add('/lab', { view:'view-test-login', init: options.onTestLogin })
router.add('/lab/dashboard', { view:'view-dashboard', init: options.onTestDashboard })
router.add('/lab/entrenador', { view:'view-trainer', init: options.onTestTrainer })
// ... /lab/closer-elite, /lab/base-conocimiento, /lab/shadow, etc. 9 rutas
```

### 4.4 `frontend/src/app.ts:17,44-62,635-750`

- Import `TestLab` + `openai-theme.css`
- `initOpenAITheme()` con `setOpenAITheme(on)` + `localStorage gravity_openai_theme` + `?theme=openai/dark` + botón `#lab-theme-toggle`
- `initApp()` early return si `isLabPath(path)` → `store.currentUser = MOCK`, `handleTestSession(path)`
- `handleTestSession()` crea router lab con `onTestLogin`, `onTestDashboard` (mock `initUserWeeklyDashboard`), `onTestTrainer` etc., intercepta clicks del sidebar para prefijar `/lab`, muestra `lab-banner`, hidrata `user-display-name` como `Tester Lab (sin permisos)`.

**Rutas finales:** `/lab` login, `/lab/dashboard`, `/lab/entrenador`, `/lab/closer-elite`, etc. — espejos sin auth.

---

## 5. Frontend — entrenador (esfera, verse, distribución)

### 5.1 `frontend/src/views/Trainer.ts`

- **Esfera nunca invisible:** nueva `ensureOrb()` llamada al inicio de `loadConversation()`; si no hay `token` (lab) muestra mensaje `Hola tester@lab...` en vez de `return` silencioso.
- **Morado:** `setState` glows `bg-emerald-*` → `bg-violet-*`, `stroke rgba(16,185,129` → `rgba(139,92,246`, shadow `52,211,153` → `167,139,250`, fills `167,243,208` → `221,214,254` etc.
- **Chat más oscuro:** `Gravity AI` `text-primary` → `text-gray-500` + `text-gray-300` → `text-gray-400` + `border-violet-500/30` + `break-words`.
- **Mock lab:** en `mediaRecorder.onstop`, si `isLab` (lab-user-001 || /lab) simula latencia 900ms, `tempEl` con `Hola, quiero practicar...`, `orb speaking`, `addChatMessage` mock + `speakText` (Web Speech), `return` sin `fetch`.

### 5.2 `frontend/index.html:1508-1630` — vista entrenador

- **Distribución respirable:** `h-[calc(100vh-64px)] overflow-hidden justify-center` (header `absolute top-6`, controles `absolute bottom-12`, sphere 400px, verse 560/720, todo pegado y cortado) → `min-h-[calc(100vh-64px)] overflow-auto justify-between py-6 md:py-8 gap-4` + header `relative`, orb `flex flex-col` compacto, controles `relative pb-6` → `flex-1 py-4` + `justify-start pt-4` (sutil subido) para no tapar botones.
- **Card OPERATIONAL MODE:** `bg-black/80 px-6 py-4 rounded-3xl gap-2 text-3xl` → `bg-[#4c1d95] px-4 py-3 rounded-2xl gap-1 text-2xl` (achicado para dejar aire), luego `bg-violet-950/60` → `bg-[#4c1d95]` sólido `opacity 0.85→100%` + `shadow violet`.
- **Verse morado:** nuevo `#orb-verse` 560px `radial 139,92,246 0.18→0.10` + `#orb-verse-soft` 720px, luego ajustado a 420/560 (mobile) y 480/600, blur 40/48, canvas `400` → `340` (`w 280 md:340`), `drop-shadow violet 0.32`.
- **Header:** `training-progress-bar` `bg-primary shadow green` → `bg-violet-500 shadow violet`, `training-phase-name` `text-violet-400`.
- **Tooltips:** botones `chat`/`mic`/`exit` ahora `group` + `span absolute -top-9 bg-black rounded-full` `Transcripción`/`Dictar`/`Cerrar` (solo redondeado, `title` eliminado para no duplicar).
- **Subtítulo:** `Mantén presionado...` `text-violet-400` → en `openai-theme` `color #6e6e6e` → `color #8b5cf6` (morado en ambas).

### 5.3 Otros entrenadores
- `frontend/src/lib/simple_trainer.ts` no se tocó (código muerto).

---

## 6. Frontend — closer (look Gemini morado)

### 6.1 `frontend/index.html:1665-1702` — vista closer completa

**Antes:** `flex min-h-[70vh] py-12` con `h1 font-orbitron 5xl text-violet-400` + `grid bg-secondary/30 textarea bg-transparent text-white` + `button bg-violet-500 w-full` + `prose` oscuro.

**Después — Gemini morado:**
```html
<section id="view-closer" class="hidden relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
  <div id="closer-bg-orb" class="absolute inset-0 -z-10 flex items-center justify-center">
    <div class="w-[900px] h-[600px] rounded-full blur-[90px] opacity-45" style="background: radial-gradient(ellipse at center, rgba(139,92,246,0.32) 0%, rgba(167,139,250,0.20) 32%, rgba(124,58,237,0.12) 55%, transparent 72%);"></div>
  </div>
  <div id="closer-bg-soft" class="absolute inset-0 -z-10 opacity-60" style="background: linear-gradient(to bottom, transparent 0%, rgba(139,92,246,0.10) 50%, transparent 100%);"></div>
  <h1 id="closer-title" class="text-3xl md:text-[2.1rem] font-normal text-gray-900" style="font-family:'Plus Jakarta Sans',sans-serif; color:#0d0d0d; font-weight:400;">¿Qué objeción toca hoy?</h1>
  <div id="closer-pill" class="relative bg-white rounded-full shadow border border-gray-200 flex items-center gap-2 px-4 py-2 pr-2">
    <textarea id="client-input" placeholder="Describe la objeción de tu cliente..." class="flex-1 bg-transparent text-gray-900 placeholder-gray-400 ...">...</textarea>
    <div class="flex items-center gap-1.5">
      <button>Pro</button>
      <button id="analyze-button" class="w-11 h-11 bg-violet-500 rounded-xl ...">→</button>
    </div>
  </div>
  <p id="closer-hint" class="text-xs text-gray-400 mt-3">Pulsa el <span class="text-violet-500">botón</span> para generar tu estrategia</p>
</section>
```

**Evolución del pill:** grid 5 cols `bg-secondary/30` → pill blanco `rounded-full` `shadow 0 4px 24px rgba(0,0,0,0.08)` + `focus-within:shadow violet` + `Pro` + mic (luego quitados) → solo `textarea` + `Pro` + botón flecha morada `w-11 h-11 bg-violet-500 rounded-xl` (imagen flecha). Texto hint `Pulsa Crear Playbook...` → `Pulsa el botón de la flecha...` → `Pulsa el botón para generar tu estrategia` → `Pulsa el <span class="text-violet-500">botón</span>...`.

**Posición:** `justify-center py-16` → `justify-start pt-16` (muy arriba) → `pt-10` (sutil) → `justify-center py-16` (vuelta al centro).

**Tipografía título:** `font-bold 700` → `font-normal 400` delgada como en foto `¿Qué objeción toca hoy?`.

**Botón:** `w-full bg-primary text-black rounded-2xl` → `w-11 h-11 bg-violet-500 rounded-xl` con flecha blanca `stroke 2.5`, `title` eliminado dejando solo `span` redondeado `Enviar` al hover.

**Cursor:** `span#closer-cursor` `w-[1.5px] h-5 bg-gray-900 hidden` + `@keyframes blink` + `updateCursor()`.

**Animación entrada:** `@keyframes closerBgFade` + `closerUpFade` con `translateY(16px)`, `#view-closer:not(.hidden) #closer-*` con delays 80/120/260/380ms, `opacity:0` inicial.

### 6.2 `frontend/src/views/Closer.ts`

- **Frases rotativas:** `rotatingPhrases` 6 frases, `startPhraseRotation` con `setInterval 2600ms` + fade `opacity 0.35→1`, `stopPhraseRotation`, `updateCursor`, `init()` limpia demo `No estoy seguro...`, listeners `input/focus/blur` que paran/reanudan rotación.
- **Mock lab:** en `btn.onclick`, si `isLab` (lab-user-001 || /lab) simula `Analizando...` 900ms y `mock` playbook con `tipo_objecion:Precio`, `probabilidad 72`, etc., sin `fetch`.

---

## 7. Frontend — sidebar, menú y toggles

### 7.1 `frontend/src/dashboard.css:92-155`

```css
.sidebar { width: var(--sidebar-width); will-change: width,transform; transition: width 0.35s ...; overflow:hidden; }
.main-wrapper { margin-left: var(--sidebar-width); will-change: margin-left; transition: margin-left 0.35s ...; }
.sidebar.collapsed { width: 72px !important; background: #07070a !important; }
.sidebar.collapsed~.main-wrapper { margin-left: 72px !important; }
.sidebar.collapsed .sidebar-header { display: none !important; }
#sidebar-collapsed-toggle-wrap { display: none; }
.sidebar.collapsed #sidebar-collapsed-toggle-wrap { display: flex !important; }
.sidebar.collapsed .nav-item { width:44px; height:44px; border-radius:9999px; color:#6b7280; }
.sidebar.collapsed .nav-item.active { background:#f3f4f6 !important; color:#0d0d0d !important; }
#sidebar-toggle { transition: transform 0.3s; }
#sidebar-toggle.is-collapsed svg { transform: rotate(180deg); }
html.theme-openai .sidebar.collapsed { background: rgba(255,255,255,0.92) !important; }
html.theme-openai .sidebar.collapsed .nav-item.active { background:#0d0d0d !important; color:#fff !important; }
```

### 7.2 `frontend/index.html:679-700` — header

Añadido al lado de `Gravity Symbiosis`:

```html
<button id="sidebar-toggle-header" class="ml-1 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10">
  <svg><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
</button>
```

Y topbar `#sidebar-toggle` cambiado de hamburguesa (3 líneas) a mismo icono dos paneles + `p-2 rounded-lg hover:bg-white/5`.

Y mini bottom `#sidebar-mini-bottom` (solo colapsado) con settings + 2 avatares degradados.

Y `#sidebar-collapsed-toggle-wrap` (arriba del nav colapsado) con `⊡` para reabrir (luego quitado y reañadido según pedido).

### 7.3 `frontend/src/app.ts:948-990`

```ts
const allToggleBtns = [sidebarToggleBtn, sidebarHeaderBtn, sidebarCollapsedBtn].filter(Boolean)
if (savedCollapsed && innerWidth>768) { sidebar.add('collapsed'); allToggleBtns.forEach(b=>b.classList.add('is-collapsed')) }
allToggleBtns.forEach(btn => btn.addEventListener('click', toggleSidebar))
toggleSidebar = () => {
  const isMobile = innerWidth<=768
  if (isMobile) sidebar.toggle('open')
  else { isCollapsed = sidebar.toggle('collapsed'); allToggleBtns.forEach(b=>b.classList.toggle('is-collapsed', isCollapsed)); localStorage.setItem('gravity_sidebar_collapsed', isCollapsed?'1':'0'); sidebar.getBoundingClientRect() }
}
document.addEventListener('click', e => { if (mobile && open && !sidebar.contains(e.target) && !isToggle) sidebar.remove('open') })
```

---

## 8. Frontend — transcripción y bienestar

### 8.1 `frontend/index.html:1645-1662` — drawer

```html
<div id="chat-drawer" class="absolute right-0 top-0 h-full w-[85%] max-w-[360px] sm:w-[380px] md:w-[400px] ...">
  <div class="flex items-center justify-between gap-3 p-4 border-b shrink-0">
    <h3 class="text-sm text-gray-500 tracking-widest whitespace-nowrap overflow-hidden text-ellipsis">TRANSCRIPCIÓN EN VIVO</h3>
    <button class="flex-shrink-0 p-1 rounded-lg hover:bg-white/5">X</button>
  </div>
  <div id="trainer-chat-container" class="flex-1 overflow-y-auto p-4 space-y-6">
```
Antes `w-full md:w-96` ocupaba toda la pantalla en móvil; ahora `w-[85%] max-w-[360px]` deja ver el fondo. En `openai-theme` drawer `bg rgba(255,255,255,0.97) border #e5e5e5`.

### 8.2 `frontend/src/views/Trainer.ts:518` — mensajes

`text-gray-300` → `text-gray-400` + `break-words whitespace-normal` + `Gravity AI` `text-primary` → `text-gray-500`.

### 8.3 `frontend/index.html:1763-1835` — bienestar

`bg-primary/10` etc. se volvió morado por el barrido global, ya no verde. Botones `Iniciar` `bg-violet-500` en vez de `bg-primary` verde. El borde del círculo `text-primary` ahora violeta. La foto mostraba `Iniciar` verde y círculo morado; ahora todo morado.

### 8.4 `frontend/index.html:1559-1605` — tooltips

Tres botones del entrenador (`chat`, `mic`, `exit`) ahora `group` + `span absolute -top-9 bg-black rounded-full` `Transcripción`/`Dictar`/`Cerrar` (solo redondeado, `title` eliminado para no duplicar). `#analyze-button` igual con `Enviar`.

---

## 9. Frontend — UX/UI Pro Max

**Skill:** `ui-ux-pro-max` con `search.py "B2B SaaS sales training elite dashboard" --design-system --persist -p "Gravity Symbiosis"` → `design-system/gravity-symbiosis/MASTER.md` (214 líneas).

- Pattern `Hero + Features + CTA`, Style `Glassmorphism` (blur 10-20px, border `rgba white 0.2`, light reflection), Colors `Primary #2563EB`/`Accent #EA580C` → mapeados a morado `#8b5cf6`, Typography `Plus Jakarta Sans` 300-700.
- Implementado: `@import Plus Jakarta Sans` en `openai-theme.css`, `dashboard.css`, `main.css`; `font-family: 'Plus Jakarta Sans','Inter'` en todo; `backdrop-filter: blur(16px)` en `.card/.sidebar/.topbar` con `rgba(255,255,255,0.82)` en white y `hsla(var(--card),0.78)` en dark; `cursor-pointer`, `transition 200ms`, `focus-visible` `outline 2px solid #8b5cf6`, `prefers-reduced-motion` reduce, responsive.

---

## 10. Archivos y verificación

**Nuevos:**
- `frontend/src/views/TestLab.ts`
- `frontend/src/openai-theme.css` (350+ líneas)
- `backend/test_server.py`
- `docs/laboratorio/README.md` + este `CAMBIOS_FRONTEND_BACKEND.md`
- `design-system/gravity-symbiosis/MASTER.md`
- `docs/DESIGN_SYSTEM.md`, `docs/TRAINER_VOICE_FLOW.md` (copiados de clon typo a real)
- `.env`, `.env.example`, `start_frontend.bat`, `start_backend.bat` (helpers, no prod)

**Modificados (17):**
- `frontend/src/lib/router.ts`, `frontend/src/app.ts`, `frontend/index.html`, `frontend/src/dashboard.css`, `frontend/src/main.css`, `frontend/src/views/Trainer.ts`, `frontend/src/views/Closer.ts`, `frontend/src/features/admin-data.ts`, `frontend/src/lib/utils.ts`, `frontend/src/views/AdminMetrics.ts`, `frontend/src/views/Copilot.ts`, `frontend/src/views/Wellness.ts`, `frontend/src/lib/simple_trainer.ts`, `frontend/src/views/AdminCompany.ts`, etc., `backend/services/openai_service.py`, `backend/core/config.py`

**Verificación:**
```bash
cd frontend && npm run typecheck  # 0 errors
cd frontend && npm run build      # 73 módulos, ✓ built, main-*.css 74KB, main-*.js 419KB
python -c "from core.config import client; print(bool(client))"  # True
curl http://127.0.0.1:5001/health  # {"status":"healthy"}
```

**Para probar:**
```bash
cd frontend && npm run dev  # http://localhost:5173/lab (lab sin auth) o / (real)
cd backend && python app.py  # 5001 con OPENAI_API_KEY + org
```

*Documentado: 2026-09-16 — laboratorio aislado, todo lo anterior + morado neón + OpenAI white + lab sin permisos.*

---

## 11. Tema claro por defecto + login lab en claro (2026-10-13)

### 11.1 Falla encontrada

El login del laboratorio (/lab) estaba maquetado **solo para tema oscuro** (rontend/index.html, #view-test-login: g-black, 	ext-white, 	ext-gray-500/400, bordes order-white/10, acentos amber con alfa). Pero el lab arranca por defecto en tema claro (pp.ts → initOpenAITheme), y openai-theme.css solo tenía overrides para los 2 botones (#test-login-enter / #test-login-back), no para fondo ni textos.

**Resultado visual:** tema claro activo = mezcla rota — fondo negro alrededor + tarjeta clara con textos gris/lavado sin contraste (el usuario reporta "no aparece el diseño claro").

### 11.2 Fix 1 — adaptación clara del login lab

rontend/src/openai-theme.css (bloque nuevo antes de "Sections"):

| Selector | Reglas |
|---|---|
| #view-test-login | fondo #fafafa |
| #view-test-login .card | blanco #ffffff, borde #fde68a, sombra suave |
| #view-test-login h1 / h1 span | #0d0d0d / #8b5cf6 |
| [class*="text-amber"] | #92400e (amber legible sobre blanco) |
| [class*="bg-amber-500/5"], g-amber-500/15 | #fffbeb + borde #fde68a |
| .text-gray-500/400 | #6e6e6e |
| .text-gray-600 | #9b9b9b |
| #test-login-back | blanco, borde #e5e5e5, hover borde negro |

El tema oscuro no cambia (todo prefijado html.theme-openai).

### 11.3 Fix 2 — tema claro por defecto en toda la app

rontend/src/app.ts (initOpenAITheme):

`
// Antes: solo /lab arranca en white, resto usaba guardado
const shouldOn = saved ? saved === '1' : isLab;
// Después
const shouldOn = saved ? saved === '1' : true;
`

Si localStorage.gravity_openai_theme no existe, toda la app (landing, dashboard, entrenador, closer...) arranca en **OpenAI White**. El toggle sigue guardando la preferencia y ?theme=openai / ?theme=dark siguen forzando.

### 11.4 Nota multi-navegador

El tema vive en el localStorage de **cada navegador**. El preview integrado de Cursor (u otro webview) tiene storage propio e independiente de Chrome, por eso puede reflejar "otro diseño". Forzar con ?theme=openai o ?theme=dark, o recarga dura (Ctrl+Shift+R) si cachea CSS viejo.

### 11.5 Verificación

`ash
cd frontend && npx tsc --noEmit   # exit 0
cd frontend && npx eslint src/app.ts  # exit 0
`
Screenshots: /lab?theme=openai (claro limpio) y /lab?theme=dark (oscuro intacto).

*Documentado: 2026-10-13.*
