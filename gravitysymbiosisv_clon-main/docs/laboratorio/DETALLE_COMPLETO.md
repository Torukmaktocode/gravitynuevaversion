# Detalle Completo — Todo hasta el más mínimo cambio

> Laboratorio Gravity — clon `/lab` + rediseño morado neón + OpenAI White + Glassmorphism. Este archivo documenta **cada archivo, cada línea y cada token** tocado, sin omitir nada. Build verificado `73 módulos`.

---

## 0. Entorno y versiones

- **Proyecto clon:** `C:\Users\goddi\Documents\PROYECTOS DE CODIGO\gravitysymbiosisv_clon-main\gravitysymbiosisv_clon-main` (no es repo git, no se commitea al original)
- **Frontend:** `gravitysymbiosisv1@1.0.0` (`package.json:3`), Vite `5.4.21`, `npm run dev` en `5173` (salta a `5174-5179` si ocupado), `npm run build` → `dist/index.html 180KB` + `main-*.css ~74KB` + `main-*.js ~416KB`
- **Backend prod:** `2.0.0-modular` (`app.py:66`), Flask + `flask-cors` + `flask-limiter` en `5001`, `GET /health` → `{"status":"healthy"}`
- **Backend lab mock:** `2.0.0-test` (`test_server.py`)
- **Vite proxy:** `vite.config.js:44-50` `/api` → `http://127.0.0.1:5001` `rewrite: path.replace(/^\/api/, "")`, `timeout 600000`
- **Store:** `src/lib/store.ts:3` `API_URL: '/api'`
- **Supabase:** `https://nqaiuixiryqlcszikwgb.supabase.co`, anon `eyJ...` (hardcode fallback en `supa-client.ts:5-6`)
- **OpenAI:** `gpt-5.4-mini` (`core/config.py:27`), `tts-1` `shimmer` 1.1x (`openai_service.py:171`), org `org-e87JhiEcZRSWcGPUhnSgUggX`

---

## 1. Backend — `backend/`

### 1.1 `core/config.py:13-19` — org

```python
api_key = os.getenv("OPENAI_API_KEY")
if not api_key: raise ValueError(...)
org_id = os.getenv("OPENAI_ORG_ID") or os.getenv("OPENAI_ORG") or os.getenv("OPENAI_ORGANIZATION")
if org_id:
    client = OpenAI(api_key=api_key, organization=org_id)
    logger.info(f"OpenAI org configurada: {org_id[:12]}...")
else:
    client = OpenAI(api_key=api_key)
```

### 1.2 `services/openai_service.py:171`

```python
response = client.audio.speech.create(model="tts-1", voice="shimmer", speed=1.1, input=text)
# se probó model="gpt-4o-mini-tts", voice="marin" y se revirtió a shimmer por confirmación
```

### 1.3 `.env` raíz y `backend/.env` (gitignore)

```
OPENAI_API_KEY=sk-proj-fx9q... (72+ chars, no loguear)
OPENAI_ORG_ID=org-e87JhiEcZRSWcGPUhnSgUggX
OPENAI_MODEL=gpt-5.4-mini
SUPABASE_URL=https://nqaiuixiryqlcszikwgb.supabase.co
SUPABASE_KEY=eyJ... (anon, usado como VITE_*)
VITE_SUPABASE_URL / VITE_SUPABASE_KEY (mismo anon)
PORT=5001
```

### 1.4 `backend/test_server.py` (nuevo, 120 líneas)

Mock Flask para UI sin claves, `app.run(port=5001)`:
- `GET /`, `/health`
- `POST /auth/v1/token`, `/auth/v1/signup`, `GET /auth/v1/user` → `MOCK_USER lab-user-001`
- `GET /rest/v1/email_whitelist` → `[{email}]` (whitelist abierta), `profiles`, `conversations`, `messages`, `daily_metrics`, `companies`, `invitations`
- `POST /entrenar`, `/analizar`, `/generar_plan`, `GET /conocimiento/*`

### 1.5 Otros

- `requirements.txt` 9 deps instaladas (`pip install -r` 385 packages)
- `app.py:22` CORS `origins=[localhost:5173,4173,gravitysymbiosis.com]` intacto
- `.env.example`, `start_frontend.bat`, `start_backend.bat` helpers (borrables)

---

## 2. Frontend — paleta morada neón (dark y white)

### 2.1 `src/dashboard.css:1-31`

```css
/* antes */
--foreground: 145 60% 90%; --primary: 145 63% 49%; --border: 145 63% 20%; --input:145 63% 10%; --ring:145 63% 49%;
/* después — #8b5cf6 hsl 258 89% 66% */
--foreground: 270 15% 92%; --primary: 258 89% 66%; --border: 258 45% 22%; --input:258 45% 14%; --ring:258 89% 66%;
--card-foreground: 270 12% 84%; --popover-foreground: 270 15% 92%; --secondary-foreground:270 12% 72%; --muted-foreground:270 10% 55%;
@import url('Plus Jakarta Sans');
body { font-family:'Plus Jakarta Sans','Inter',system-ui,sans-serif; }
```

### 2.2 `src/main.css:1-12`

```css
/* antes */
--plasma:#2ccd70; --fire:#28D20F; --gold:#00FF66; --grid:rgba(44,205,112,0.06); --glow-c:rgba(44,205,112,0.18);
/* después */
--plasma:#8b5cf6; --fire:#7c3aed; --gold:#a78bfa; --grid:rgba(139,92,246,0.06); --glow-c:rgba(139,92,246,0.18); --glow-f:rgba(124,58,237,0.18);
body { font-family:'Plus Jakarta Sans','Inter',system-ui,sans-serif; }
```

### 2.3 Barrido global verde→morado en `src/` (script Python)

```
#2ccd70→#8b5cf6, #28D20F→#7c3aed, #00ff88→#8b5cf6, #00FF66→#a78bfa, 44,205,112→139,92,246,
16,185,129→139,92,246, 52,211,153→167,139,250, 0,255,102→139,92,246,
bg-green-*→bg-violet-*, text-green-*→text-violet-*, border-green-*→border-violet-*
Archivos: app.ts, dashboard.css, main.css, features/admin-data.ts, lib/utils.ts, views/AdminMetrics.ts, views/Copilot.ts, views/Trainer.ts, index.html (Wellness)
Verificado: Select-String green → solo var(--green) con valor #8b5cf6, 0 clases `bg-green`
```

### 2.4 `src/openai-theme.css` (nuevo, 360+ líneas)

Importado en `app.ts:2`. Tokens:

```css
html.theme-openai {
  --void:#ffffff; --deep:#fafafa; --plasma:#8b5cf6; --fire:#6d28d9; --white:#0d0d0d; --dim:#6e6e6e;
  --background:0 0% 100%; --foreground:0 0% 5%; --card:0 0% 100%; --primary:258 89% 66%; --secondary:0 0% 96%; --muted:0 0% 96%; --muted-foreground:0 0% 43%; --border:0 0% 90%; --ring:258 89% 66%; --radius:12px;
}
```

Tipografía: `Inter` → `Plus Jakarta Sans` en **todo** (`body,h1-h4,p,a,button,input,label,span,div`), 16px 1.65lh tracking -0.011em, display `Plus Jakarta 700-800 -0.03em`, radii 12px/pill 9999px.

Landing: `nav` `rgba(255,255,255,0.86)` + hairline `#e5e5e5`, `nav-cta` `bg #0d0d0d`, `hero-title` `Inter 800`, `cards` `bg #ffffff border #e5e5e5`, `btn` `rounded 9999px clip-path:none`.

Barrido: `164 84% 32%`→`258 89% 66%`, `#10a37f`→`#8b5cf6`, `rgba(16,163,127`→`rgba(139,92,246`.

Glassmorphism (skill): `.card/.sidebar/.topbar` `backdrop-filter: blur(16px) saturate(1.15)` + `rgba(255,255,255,0.82)` + `inset 0 1px 0 rgba(255,255,255,0.8)`, `cursor-pointer`, `transition 200ms`, `focus-visible outline 2px solid #8b5cf6`.

Closer entrada: `@keyframes closerBgFade` + `closerUpFade` `translateY(16px)`, `#view-closer:not(.hidden) #closer-*` delays 80/120/260/380ms.

Trainer header fix blanco: `#training-phase-name` `#5b21b6`, `#performance-score/#training-progress-val` `#4b5563`, `.h-1` `bg #f3f4f6 border #e5e7eb`.

Playbook legible: `.bg-secondary/10,20` → `bg #ffffff border #e5e7eb`, `.text-white` → `#0d0d0d`, `.text-gray-300` → `#374151`, `.bg-primary/5` → `#f5f3ff`.

Logo legible: `.nav-logo .logo-main/.logo-sub` y `.sidebar-header span` → `#0d0d0d`.

Verse: `#orb-verse` `opacity 0.32` en white.

Closer pill cursor: `@keyframes blink` + `#closer-cursor`.

---

## 3. Frontend — laboratorio `/lab`

### 3.1 `src/views/TestLab.ts` (nuevo, 50 líneas)

`MOCK_USER id lab-user-001`, `MOCK_PROFILE`, `isLabPath`, `getLabView`, `enterLab`, `setupTestLogin`.

### 3.2 `index.html:648-672` — `section#view-test-login` + `div#lab-banner`

Login clon sin validación, badge `MODO LAB` ámbar, botón `#test-login-enter` → `enterLab`, banner sticky ámbar con `◐ OpenAI White` toggle.

### 3.3 `src/lib/router.ts:169-180` — 9 rutas

`/lab`→`view-test-login`, `/lab/dashboard`→`view-dashboard`, `/lab/entrenador`→`view-trainer`, `/lab/closer-elite`, `/lab/base-conocimiento`, etc.

### 3.4 `src/app.ts:17,44-80,635-760`

- `import TestLab` + `openai-theme.css`
- `initOpenAITheme()` con `setOpenAITheme(on)` + `localStorage gravity_openai_theme` + `?theme=openai/dark` + `#lab-theme-toggle`
- `initApp()` early return si `isLabPath` → `store.currentUser = MOCK`, `handleTestSession`
- `handleTestSession()` crea router lab con `onTestLogin`, `onTestDashboard` (mock `initUserWeeklyDashboard`), `onTestTrainer` etc., intercepta sidebar clicks para prefijar `/lab`, muestra `lab-banner`.

---

## 4. Frontend — entrenador

### 4.1 `src/views/Trainer.ts`

- `ensureOrb()` al inicio de `loadConversation()` + si `!token` muestra `Hola tester@lab...` en vez de `return`
- `setState` glows `bg-emerald`→`bg-violet`, `stroke rgba(16,185,129`→`rgba(139,92,246`, shadow/fills a violet
- `addChatMessage` `text-gray-300`→`text-gray-400` + `break-words`, `Gravity AI` `text-gray-500`
- `mediaRecorder.onstop`: si `isLab` (lab-user-001 || /lab) simula 900ms, `tempEl` con `Hola, quiero practicar...`, `orb speaking`, `addChatMessage` mock + `speakText` (Web Speech), `return` sin `fetch`
- Si `!token` y no lab → error `Sesión no encontrada`

### 4.2 `index.html:1513-1630` — vista entrenador

- Sección `h-[calc(100vh-64px)] overflow-hidden justify-center` → `min-h-[calc(100vh-64px)] overflow-auto justify-between py-6` + header `absolute top-6` → `relative`, orb `shrink-0 mb-12` → `flex flex-col py-2 gap-1 shrink-0`, controles `absolute bottom-12` → `relative pb-6` → luego `flex-1 py-4` + `pt-4` sutil, `min-h` + `justify-start` centrado → `justify-between` → `justify-start pt-4`
- Card `OPERATIONAL MODE` `bg-black/80 px-6 py-4 rounded-3xl gap-2 text-3xl` → `bg-[#4c1d95] px-4 py-3 rounded-2xl gap-1 text-2xl` → `bg-violet-950/60` → `bg-violet-950/85` → `bg-[#4c1d95]` sólido
- Verse `w-[560px] h-[560px] blur 48px opacity 0.6` → `420/480` + `560/600` `blur 40/48` `opacity 0.50/0.25`, canvas `400` → `340` `w 280 md:340` `drop-shadow violet 0.32`
- Header `training-progress-bar` `bg-primary shadow green` → `bg-violet-500 shadow violet`, `training-phase-name` `text-violet-400`
- Tooltips `group` + `span absolute -top-9 bg-black rounded-full` `Transcripción`/`Dictar`/`Cerrar` (title eliminado para no duplicar)
- Subtítulo `Mantén...` `text-violet-400` → en `openai-theme` `#6e6e6e` → `#8b5cf6`
- Título closer `font-bold` → `font-normal 400` delgado

---

## 5. Frontend — closer

### 5.1 `index.html:1665-1703`

Reemplazo completo: `flex min-h-[70vh] py-12` con `h1 font-orbitron 5xl text-violet-400` + `grid bg-secondary/30 textarea` + `button w-full bg-violet-500` →

```html
<section id="view-closer" class="hidden relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
  <div id="closer-bg-orb" class="absolute inset-0 -z-10 flex items-center justify-center"><div class="w-[900px] h-[600px] blur-[90px] opacity-45" style="background: radial-gradient(ellipse at center, rgba(139,92,246,0.32) 0%, ...)"></div></div>
  <h1 id="closer-title" class="text-3xl md:text-[2.1rem] font-normal text-gray-900" style="font-family:'Plus Jakarta Sans'; color:#0d0d0d; font-weight:400;">¿Qué objeción toca hoy?</h1>
  <div id="closer-pill" class="relative bg-white rounded-full shadow border border-gray-200 flex items-center gap-2 px-4 py-2 pr-2">
    <span id="closer-cursor" class="absolute left-6 w-[1.5px] h-5 bg-gray-900 hidden" style="animation: blink 1s step-end infinite;"></span>
    <textarea id="client-input" placeholder="Describe la objeción..." class="flex-1 bg-transparent ...">...</textarea>
    <div class="flex items-center gap-1.5">
      <button>Pro</button>
      <button id="analyze-button" class="w-11 h-11 bg-violet-500 rounded-xl ..."><svg>↑</svg></button>
    </div>
  </div>
  <p id="closer-hint" class="text-xs text-gray-400 mt-3">Pulsa el <span class="text-violet-500">botón</span> para generar tu estrategia</p>
</section>
```

Pill evolucionó: `+` y micrófono eliminados, `w-11 h-11 bg-violet-500 rounded-xl` con flecha blanca `stroke 2.5`, `title` dejado solo con `span` redondeado `Enviar`/`Dictar`.

Texto hint `Pulsa Crear Playbook...` → `Pulsa el botón de la flecha...` → `Pulsa el botón para generar tu estrategia` → con `botón` en `text-violet-500`.

Posición `justify-center py-16` → `justify-start pt-16` → `pt-10` → `justify-center py-16`.

### 5.2 `src/views/Closer.ts`

Frases rotativas: `rotatingPhrases` 6 frases, `startPhraseRotation` `setInterval 2600ms` fade `opacity 0.35→1`, `stopPhraseRotation`, `updateCursor`, `init()` limpia demo, listeners `input/focus/blur`.

Mock lab: `isLab` (lab-user-001 || /lab) en `btn.onclick` simula 900ms y `mock` playbook con `probabilidad 72` sin `fetch`.

Render: `Probabilidad de Cierre` `text-primary` → `text-violet-600`, `drop-shadow green` → `violet`, `w-12 border-primary/40` → `border-violet-400 bg-white`, `bg-primary/5` → `bg-violet-50 border-violet-200`, y en `renderPlaybook` todos los `bg-secondary/10` → `bg-white border-gray-200 border-l-4 border-l-violet-500` con `text-gray-900/600` para legibilidad.

Verde eliminado: `bg-emerald`→`bg-violet`, `shadow-[0_0_20px_rgba(57,255,20`→`rgba(139,92,246`.

### 5.3 `index.html:1705` — result

`w-1 bg-violet-500/50 shadow green` → `shadow violet`.

---

## 6. Frontend — sidebar y toggles

### 6.1 `src/dashboard.css:92-155`

```css
.sidebar { will-change: width,transform; transition: width 0.35s ...; overflow:hidden; }
.main-wrapper { will-change: margin-left; transition: margin-left 0.35s; }
.sidebar.collapsed { width:72px !important; background:#07070a !important; }
.sidebar.collapsed~.main-wrapper { margin-left:72px !important; }
.sidebar.collapsed .sidebar-header { display:none !important; }
#sidebar-collapsed-toggle-wrap { display:none; } .sidebar.collapsed #sidebar-collapsed-toggle-wrap { display:flex !important; }
.sidebar.collapsed .nav-item { width:44px; height:44px; border-radius:9999px; color:#6b7280; }
.sidebar.collapsed .nav-item.active { background:#f3f4f6 !important; color:#0d0d0d !important; }
#sidebar-toggle { transition: transform 0.3s; } #sidebar-toggle.is-collapsed svg { transform: rotate(180deg); }
html.theme-openai .sidebar.collapsed { background: rgba(255,255,255,0.92) !important; }
html.theme-openai .sidebar.collapsed .nav-item.active { background:#0d0d0d !important; color:#fff !important; }
```

### 6.2 `index.html:679-702`

Header `pl-5` → `pl-5 pr-2` + `div flex gap-2` con `span Gravity` + `button#sidebar-toggle-header` con icono dos paneles `rect 18×18 rx2 + line x1=9` (mismo que topbar).

Topbar `#sidebar-toggle` hamburguesa 3 líneas → dos paneles `rect 18×18 rx2 + line x1=9` + `p-2 rounded-lg hover:bg-white/5` + `title`.

Mini bottom `#sidebar-mini-bottom` (settings + 2 avatares) añadido y luego eliminado por pedido `quita todo lo verde` + `quita eso del menu` (ahora solo nav items, sin avatares).

Toggle colapsado `w-9 h-9` → `w-11 h-11` para centrado como nav-items.

### 6.3 `src/app.ts:948-995`

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

Luego se quitó `sidebarCollapsedBtn` del array al pedir quitar el botón de arriba.

---

## 7. Frontend — transcripción, bienestar, etc.

### 7.1 `index.html:1645` — drawer

`w-full md:w-96` (pantalla completa en móvil) → `w-[85%] max-w-[360px] sm:w-[380px] md:w-[400px]` + `gap-3` + `whitespace-nowrap overflow-hidden text-ellipsis` + `flex-shrink-0` + `p-1 rounded`.

En `openai-theme` `bg rgba(255,255,255,0.97) border #e5e5e5`.

### 7.2 `src/views/Trainer.ts:518`

`text-gray-300` → `text-gray-400` + `break-words whitespace-normal`.

### 7.3 `index.html:1763-1835` — bienestar

`bg-[#0a0a0a] border-white/5` ya morado por barrido, pero se verificó que `Iniciar` `bg-violet-500` no sea verde (ahora morado), círculo `text-primary` violeta.

### 7.4 Otros

`src/views/AdminCompany.ts`, `AdminUsers.ts`, `Copilot.ts`, `Knowledge.ts`, `Profile.ts`, `lib/simple_trainer.ts`, `features/admin-data.ts`, `lib/utils.ts` verdes → violet via script.

---

## 8. Diseño — por qué no respiraba y fix

- **Problema:** `view-trainer` con `h-[calc(100vh-64px)] overflow-hidden justify-center` + `header absolute top-6` + `orb shrink-0 mb-12` 400px + `controles absolute bottom-12` = todo pegado, botones cortados (`h-full` con drawer superpuesto, texto cortado `TRANSCRIPCIÓN I`).
- **Fix:** `min-h-[calc(100vh-64px)] overflow-auto justify-between py-6 gap-4` + header `relative` + orb `flex flex-col py-2 gap-1` + controles `relative pb-6` + orb `340px w 280 md:340` + verse `420/480` + `OP MODE` achicado `px-4 py-3 rounded-2xl text-2xl` + drawer `w-[85%]` + `break-words` + todo `subido sutil` `pt-10` → `justify-center`.

---

## 9. Verificación

```bash
cd frontend && npm run typecheck # 0 errors (tsc --noEmit)
cd frontend && npm run build      # 73 módulos, ✓ built, ~74KB css, ~416KB js
python -c "from core.config import client; print(bool(client))" # True
curl http://127.0.0.1:5001/health # {"status":"healthy"}
curl -X POST http://127.0.0.1:5001/analizar -d '{"objecion":"Es caro"}' # 200 con playbook morado
curl -X POST http://127.0.0.1:5173/api/analizar # via Vite proxy 200
```

---

*Última actualización: 2026-09-16 — documenta hasta el `px`, `rgba` y `line` tocado. Todo en `docs/laboratorio/`.*
