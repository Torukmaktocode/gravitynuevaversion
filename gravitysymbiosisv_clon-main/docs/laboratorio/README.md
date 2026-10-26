# Laboratorio Gravity — Carpeta de Pruebas Aislada

> **Clon sin permisos para probar diseño, flujos y UX sin destruir código productivo.**
> Todo lo que está en `/lab` es visual y no toca Supabase, whitelist ni el flujo real de login.

---

## Índice

1. [Objetivo](#1-objetivo)
2. [Historial — qué hicieron las IAs anteriores](#2-historial--qué-hicieron-las-ias-anteriores)
3. [Lo creado ahora — backend y frontend de pruebas](#3-lo-creado-ahora--backend-y-frontend-de-pruebas)
4. [Estructura de archivos](#4-estructura-de-archivos)
5. [Cómo usar el laboratorio](#5-cómo-usar-el-laboratorio)
6. [Qué NO se tocó (seguridad)](#6-qué-no-se-tocó-seguridad)
7. [Tema OpenAI White](#7-tema-openai-white--aplicado-al-front)
8. [Cambios de colores](#8-cambios-de-colores--verde-neón--morado-neón--esfera--logo--closer)
9. [Mejora UX/UI Pro Max](#9-mejora-uxui-pro-max--glassmorphism--plus-jakarta-sans)
10. [Comandos](#10-comandos)

---

## 1. Objetivo

- Probar cambios de **diseño**, **funcionalidades** y **modelos** en local sin romper el proyecto original.
- Entrar al interior (dashboard, entrenador, closer, base conocimiento, etc.) **sin whitelist ni password real**.
- Clon exacto del **home/login** y del **interior**, pero con ruta `/lab` aislada.
- Todo queda en `docs/laboratorio/` + código aditivo en `frontend/src/views/TestLab.ts` — el flujo real (`/login`, `/dashboard`) sigue intacto.

---

## 2. Historial — qué hicieron las IAs anteriores

### 2.1 Documentación generada (en `docs/`)

| Archivo | Qué documenta |
|---------|---------------|
| `docs/DESIGN_SYSTEM.md` | Sistema de diseño completo: paleta `primary hsl(145,63%,49%)`, tipografías (Inter, Orbitron, Rajdhani), layout, componentes, efectos, animaciones, cursor, breakpoints, z-index, Tailwind tokens, admin palette, heat-map calendario. 17 secciones. |
| `docs/TRAINER_VOICE_FLOW.md` | Flujo voz completo del Entrenador en 27 secciones: hold-to-talk state machine (`trainerHold.ts`), `MediaRecorder` con timeslice 250ms, `FormData` a `POST /entrenar`, backend Flask (transcripción Whisper `whisper-1` español, `langdetect`, `apply_tts_fixes`), historial 10 mensajes, `get_company_assistant_id`, `clasificar_intencion`, `get_system_prompt`, `gpt-5.4-mini` temp 0.7, TTS `tts-1` voz `shimmer` 1.1x, persistencia `conversations`/`messages`, reproducción `AudioContext` + fallback `HTMLAudio`, orb 500 partículas (`ParticleOrb`), chat drawer, timer `recordInteractionStart/End`. |
| `docs/GRAVITY_SYMBIOSIS_TECHNICAL_DOCUMENTATION.md`, `docs/HELP_PILDORAS_2.0.md`, etc. | Docs previos del proyecto (arquitectura multi-tenant, conocimiento por empresa, scoring). |

### 2.2 Código y correcciones previas (ver `AGENTS.md`)

- **Scoring & DB** — `daily_metrics.training_minutes = FLOOR(SUM(LEAST(block_duration,3600))/60)`, `total_minutes = training + FLOOR(closer*0.5)+FLOOR(quiz*0.5)`, triggers `sync_daily_metrics_on_training`, `increment_daily_quiz_answer`, `sync_daily_metrics_on_closer`.
- **Hold-to-talk Chrome/Windows** — `frontend/src/lib/trainerHold.ts` (máquina de estados con `pointer capture`, `stopOnceStarted`, `pickAudioMimeType`, `audioBlobLooksEmpty`), `Trainer.ts` con `MediaRecorder` timeslice 250ms.
- **Audio móvil** — `unlockAudio()` + `playResponseAudio()` vía `AudioContext.decodeAudioData` con fallback `HTMLAudioElement playsInline`.
- **Auth recovery** — `passwordRecovery.ts`, `supa-client.ts:establishRecoverySession()` para `?code=` PKCE y `token_hash`.
- **Knowledge multi-tenant** — `knowledge_content` por `company_id`, RLS, `AdminKnowledge.ts`.
- **Graphify** — grafo en `graphify-out/` (823 nodos, 1422 edges).

> Todo ese historial sigue intacto. El laboratorio solo **agrega** encima.

---

## 3. Lo creado ahora — backend y frontend de pruebas

### 3.1 Frontend — clon sin permisos

**Archivo nuevo:** `frontend/src/views/TestLab.ts`

```ts
MOCK_USER  = { id:'lab-user-001', email:'tester@lab.local' }
MOCK_PROFILE = { id:'lab-user-001', role:'user', company_id:null, ... }
isLabPath(path) // /lab* => true
getLabView(path) // /lab/entrenador -> view-trainer
enterLab(router) // router.navigate('/lab/dashboard')
setupTestLogin(router) // botón #test-login-enter
```

**HTML nuevo:** `frontend/index.html:648-665`
- `section#view-test-login` — clon visual del login con badge `MODO LAB` ámbar, sin inputs de validación, botón `ENTRAR AL LABORATORIO →` y `Volver al inicio real`.
- `div#lab-banner` — barra superior ámbar fija visible solo en interior lab: `🧪 MODO LABORATORIO — Datos falsos · Sin permisos`.

**Router:** `frontend/src/lib/router.ts:169-180`
```
/lab                -> view-test-login
/lab/login          -> view-test-login
/lab/dashboard      -> view-dashboard
/lab/alfred-ai      -> view-alfred
/lab/entrenador     -> view-trainer
/lab/closer-elite   -> view-closer
/lab/base-conocimiento -> view-knowledge
/lab/shadow         -> view-copilot
/lab/bienestar      -> view-wellness
/lab/perfil         -> view-profile
```

**App:** `frontend/src/app.ts:17,555-562,635-740`
- Import `TestLab`
- En `initApp()` si `TestLab.isLabPath(path)` → setea `store.currentUser/Profile = MOCK`, llama `handleTestSession(path)` y `return` (no entra al flujo normal de whitelist/Supabase).
- `handleTestSession()` crea router lab con `onTestLogin`, `onTestDashboard`, etc., muestra `lab-banner`, intercepta clicks del sidebar para que `/dashboard` vaya a `/lab/dashboard` cuando estás en lab.
- `onTestDashboard` hace `try { initUserWeeklyDashboard() }` con mock (no rompe si no hay datos reales).

**Resultado:** `/lab` y `/lab/*` son espejos visuales perfectos del login y del interior, pero **cero validación**.

### 3.2 Backend de pruebas (opcional)

**Archivo:** `backend/test_server.py` (no reemplaza `app.py`)

Mock Flask en `http://localhost:5001` para cuando quieres probar sin claves reales (`OPENAI_API_KEY`, `SUPABASE_KEY`). Endpoints falsos:

- `GET /`, `/health`
- `POST /auth/v1/token`, `/auth/v1/signup`, `GET /auth/v1/user` — devuelve `MOCK_USER`
- `GET /rest/v1/email_whitelist` — siempre devuelve `[{email: ...}]` (whitelist abierta)
- `GET /rest/v1/profiles`, `/rest/v1/conversations`, `/rest/v1/messages`, `/rest/v1/daily_metrics`, etc.
- `POST /entrenar`, `/analizar`, `/generar_plan`, `GET /conocimiento/modulos`

**Si quieres IA real (Whisper/GPT/TTS) usa el backend real:**
```
cd backend && python app.py  # requiere .env con OPENAI_API_KEY y SUPABASE_KEY service_role
```
El laboratorio de frontend **no necesita backend** para probar diseño — funciona solo.

---

## 4. Estructura de archivos

```
frontend/
  src/
    views/TestLab.ts          <- NUEVO, clon sin permisos
    lib/router.ts             <- + rutas /lab/*
    app.ts                    <- + handleTestSession + bypass
  index.html                  <- + view-test-login + lab-banner
  package.json                <- intacto (solo npm install)

backend/
  app.py                      <- INTACTO (producción)
  test_server.py              <- NUEVO, mock opcional puerto 5001
  core/config.py              <- INTACTO
  requirements.txt            <- INTACTO

docs/
  DESIGN_SYSTEM.md            <- IA anterior
  TRAINER_VOICE_FLOW.md       <- IA anterior
  laboratorio/
    README.md                 <- ESTE ARCHIVO (índice del lab)
```

Archivos helpers no esenciales (puedes borrarlos sin afectar nada):
- `.env`, `.env.example`, `start_frontend.bat`, `start_backend.bat` en raíz del proyecto.

---

## 5. Cómo usar el laboratorio

### Levantar localhost (sin tocar código)

Terminal 1:
```bash
cd "C:\Users\goddi\Documents\PROYECTOS DE CODIGO\gravitysymbiosisv_clon-main\gravitysymbiosisv_clon-main\frontend"
npm run dev
# abre http://localhost:5173/lab  (si 5173 ocupado Vite usa 5174/5175/...)
```

Terminal 2 (solo si quieres backend mock):
```bash
cd "C:\Users\goddi\Documents\PROYECTOS DE CODIGO\gravitysymbiosisv_clon-main\gravitysymbiosisv_clon-main\backend"
python test_server.py
# http://localhost:5001
```

### Rutas de prueba

| URL | Qué ves |
|-----|---------|
| `/lab` o `/lab/login` | Clon del login sin validación — botón único |
| `/lab/dashboard` | Interior dashboard con datos mock |
| `/lab/entrenador` | Entrenador (orb + chat) |
| `/lab/closer-elite` | Closer Elite |
| `/lab/base-conocimiento` | Base conocimiento |
| `/lab/shadow`, `/lab/bienestar`, `/lab/perfil` | Resto del interior |

Todo con banner ámbar arriba. Click en sidebar dentro de lab navega a `/lab/*` automáticamente.

### Rutas reales (siguen exigiendo whitelist/Supabase)

- `/`, `/login`, `/dashboard`, `/entrenador`, etc. — comportamiento original intacto.

---

## 6. Qué NO se tocó (seguridad)

- No se modificó `supa-client.ts:60-66` (whitelist check real).
- No se modificó `core/config.py` (sigue exigiendo `OPENAI_API_KEY` y `SUPABASE_KEY` reales en `app.py`).
- No se tocó `AGENTS.md`, triggers SQL, ni RLS.
- No hay `git` en este clon, así que nada se commiteó al repo original.
- El lab es **solo visual**: si modificas un componente dentro de `view-dashboard`, el cambio se ve tanto en `/dashboard` como en `/lab/dashboard` (comparten la misma vista), pero el acceso a lab no abre agujeros en el auth real.

**Para borrar el lab y dejar el clon pristino:** elimina `frontend/src/views/TestLab.ts`, revierte `router.ts`, `app.ts`, `index.html` (o `git checkout -- .` si fuera repo) y borra `backend/test_server.py` + `docs/laboratorio/`.

---

## 7. Tema OpenAI White — aplicado al front

**Inspiración:** plataforma OpenAI (2025 rebrand). Investigación vía `openai.com/brand` + Apps SDK + `open-design.ai/openai`.

**Paleta extraída (fondo blanco puro) — inicial teal:**
- `bg #ffffff` (canvas), `fg #0d0d0d` (ink near-black), `muted #6e6e6e` / `#9b9b9b`, `border #e5e5e5` hairline, `surface #fafafa` mist / `#f5f5f5` pearl, `accent #10a37f` teal (hover `#0a7a5e`, soft `#e8f5f0`), `error #ef4146`.
- Tipografía: `Inter` (stand-in de `Söhne` / `OpenAI Sans`), 16px base, 1.65 lh, tracking -0.011em, display `Inter 700-800` tight, radii 12px, pills 9999px, sombras sutiles, sin gradientes.

**Implementación en Gravity:**
- `frontend/src/openai-theme.css` — overrides de `dashboard.css`/`main.css` vía `html.theme-openai` (variables HSL + landing + dashboard + sidebar + cards). Importado en `app.ts:2`.
- Auto-activo en `/lab` (por defecto white), toggle `◐ OpenAI White / ◑ Gravity Dark` en `#lab-banner` (`localStorage gravity_openai_theme`).
- También forzable global: `?theme=openai` o `?theme=dark` en cualquier ruta.
- Revisión completa de títulos/botones/cards para que *todo respire OpenAI* (Inter en todos los elementos, sin `clip-path`, sin neón verde).

**Cómo probar:**
- `http://localhost:5173/lab` → white OpenAI por defecto. Click en banner para alternar a dark Gravity y comparar.
- `http://localhost:5173/?theme=openai` → landing en white.

## 8. Cambios de colores — verde neón → morado neón + esfera + logo + closer

**Pedido:** todo el acento verde neón pasa a morado neón, en **dark y white**, incluida la esfera.

**Paleta morada elegida:**
- Principal `#8b5cf6` (hsl `258 89% 66%`), hover `#7c3aed` / `#6d28d9`, soft `#f5f3ff`, glow `rgba(139,92,246,0.12)`

**Archivos tocados:**

| Archivo | Cambio |
|---------|--------|
| `frontend/src/dashboard.css:11-26` | `--primary` `145 63% 49%` → `258 89% 66%`, `--ring` igual, `--border` `145 63% 20%` → `258 45% 22%`, `--input` `145 63% 10%` → `258 45% 14%`, `--foreground` `145 60% 90%` → `270 15% 92%` (lavanda), `--card-foreground`/`--secondary-foreground`/`--muted-foreground` a tonos lavanda |
| `frontend/src/main.css:2-8` | `--plasma` `#2ccd70` → `#8b5cf6`, `--fire` `#28D20F` → `#7c3aed`, `--gold` `#00FF66` → `#a78bfa`, `--grid`/`--glow-c`/`--glow-f` `rgba(44,205,112` → `rgba(139,92,246` |
| `frontend/src/openai-theme.css` | Reemplazo global `164 84% 32%` → `258 89% 66%`, `#10a37f` → `#8b5cf6`, `#0a7a5e` → `#6d28d9`, `rgba(16,163,127` → `rgba(139,92,246` (teal → morado en white) |
| `frontend/src/views/Trainer.ts:598-723` | Esfera `ParticleOrb` emerald → violet: glows `bg-emerald-*` → `bg-violet-*`, líneas `rgba(16,185,129` → `rgba(139,92,246`, puntos `rgba(52,211,153` → `rgba(167,139,250`, `rgba(167,243,208` → `rgba(221,214,254`, shadow `rgba(52,211,153,0.5)` → `rgba(167,139,250,0.5)` |
| `frontend/index.html:1549-1565` | Verse detrás de la esfera: dos capas `div#orb-verse` (560px, `radial-gradient 139,92,246 0.18→0.10→0.06→transparent 75%, blur 48px, opacity 0.6`) + `div#orb-verse-soft` (720px, `radial-gradient 139,92,246 0.08→transparent 65%, blur 64px, opacity 0.30`), canvas `drop-shadow 0 0 32px rgba(139,92,246,0.35)`, mensaje final `drop-shadow rgba(139,92,246,0.6)`. En `openai-theme.css` se suaviza a `opacity 0.32/0.16` y responsive 420/560px en mobile |
| `frontend/src/openai-theme.css:73` | Logo legible en blanco: `.nav-logo .logo-main/.logo-sub` y `.sidebar-header span` forzados a `#0d0d0d` (antes heredaba y quedaba lavado), `.logo-sub::before/after` a `#0d0d0d` 0.18 |
| `frontend/src/dashboard.css:353-368` | Botón Closer blanco en ambas versiones: `#analyze-button { background:#ffffff !important; color:#0d0d0d !important; border:1px solid #e5e5e5 !important; border-radius:16px !important; clip-path:none !important; }` + hover `translateY(-1px)` |

**Builds verificados:** `main-nekzcH5S.css` (morado) → `main-DWmPQdfQ.css` (closer blanco) → esfera violet → **dark sin verde**.

**Limpieza total modo dark (2026-09-15):** barrido global de todo verde (`#2ccd70`, `#28D20F`, `#00ff88`, `rgba(44,205,112`, `emerald-*`) → morado `#8b5cf6`/`#7c3aed`/`#a78bfa` en `src/main.css`, `src/dashboard.css` (`--green`/`--green-dim`/`--green-border`), `src/app.ts` (partículas), `src/views/Trainer.ts` (ya violet), `src/features/admin-data.ts`/`src/lib/utils.ts`/`src/views/AdminMetrics.ts`/`Copilot.ts`. Verificado con `Select-String -Pattern emerald` → 0 resultados.

## 9. Mejora UX/UI Pro Max — Glassmorphism + Plus Jakarta Sans

**Skill:** `ui-ux-pro-max` — `search.py "B2B SaaS sales training elite dashboard" --design-system` persistido en `design-system/gravity-symbiosis/MASTER.md`.

**Diagnóstico del skill:**
- Pattern `Hero + Features + CTA` (conversión deep CTA, 4.5:1 contraste, focus visible, reduced-motion)
- Style `Glassmorphism` (frosted glass, transparent, blurred bg 10-20px, subtle border `1px solid rgba white 0.2`, light reflection, Z-depth) — para SaaS moderno, dashboards financieros, high-end corporate. Light y Dark soportados.
- Colors `Primary #2563EB`/`Accent #EA580C` → **override a morado neón `#8b5cf6` como exige Gravity** (trust blue del skill se mapea a nuestro morado)
- Typography `Plus Jakarta Sans` (friendly modern SaaS) — Google Fonts `300;400;500;600;700`

**Implementado:**

| Archivo | Mejora |
|---------|--------|
| `frontend/src/openai-theme.css` | `@import Plus Jakarta Sans`, `font-family: 'Plus Jakarta Sans','Inter'` en todo (`body,h1-h4,p,a,button,input`), glassmorphism `backdrop-filter: blur(16px) saturate(1.15)` en `.card`/`.sidebar`/`.topbar`/`#auth-modal .card` con `rgba(255,255,255,0.82)` + `inset 0 1px 0 rgba(255,255,255,0.8)`, cursor-pointer, transición 200ms, focus `outline 2px solid #8b5cf6` + `box-shadow 0 0 0 4px rgba(139,92,246,0.15)`, `prefers-reduced-motion` reduce, responsive `overflow-x:hidden` |
| `frontend/src/dashboard.css` | `@import Plus Jakarta Sans`, `body` `Plus Jakarta Sans`, glassmorphism dark `blur(14px)` en `.card`/`.sidebar`/`.topbar` con `hsla(var(--card),0.78)` + `inset 0 1px 0 rgba(255,255,255,0.04)`, focus visible, reduced-motion |
| `frontend/src/main.css` | `@import Plus Jakarta Sans`, `body` `Plus Jakarta Sans` (Syne → Jakarta para coherencia SaaS) |
| `design-system/gravity-symbiosis/MASTER.md` | Persistido con tokens `--space-*`, `--shadow-*`, specs de botones/cards/inputs/modals, anti-patterns, checklist pre-delivery |

**Checklist skill aplicado:** no emojis como iconos (SVG), cursor-pointer, hovers 150-300ms, contraste 4.5:1, focus visible, reduced-motion, responsive 375/768/1024/1440, sin horizontal scroll.

## 10. Comandos

```bash
# verificar que no rompiste nada
npm run typecheck
npm run build   # vite build -> dist/

# correr tests
npm test

# limpiar
Remove-Item frontend/src/views/TestLab.ts
Remove-Item docs/laboratorio -Recurse
Remove-Item backend/test_server.py
```

---

*Creado: 2026-09-15 — Clon de pruebas aislado. Todo lo de IAs anteriores en `docs/` sigue vigente.*
