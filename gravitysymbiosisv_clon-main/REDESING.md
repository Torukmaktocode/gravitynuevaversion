# Rediseño — Rutas locales Modo Lab (2026-10-14)

Modo lab sin login (interior de la app, verificación visual de rediseños).
Levantar con `cd frontend && npm run dev` → Vite en `http://localhost:5173`.
Backend Flask aparte en `http://localhost:5001` (CORS ya permite 5173).

## ⚠️ Cambios estructurales de esta sesión (2026-10-14) — LECTURA OBLIGATORIA

Estos cambios modifican el comportamiento global que el programador necesita conocer antes de editar estilos/JS:

| # | Cambio | Archivos | Qué hay que saber |
|---|--------|----------|-------------------|
| 1 | **Tokens Tailwind ahora son variables CSS** (`hsl(var(--…)/<alpha-value>)`) | `frontend/index.html` (tailwind.config) | `bg-secondary/20`, `text-primary`, `bg-primary/5`… ya NO son un verde/estático hardcodeado; siguen los tokens HSL de cada scope (`:root` oscuro, `#view-dashboard.light`, tema global). Antes era `secondary: hsl(0,0%,10%)` estático — causa raíz de los grises sucios en claro. |
| 2 | **Paleta violeta-tinted en dashboard claro** | `frontend/src/dashboard.css` (bloque `#view-dashboard.light` ~1929) | Matiz 258 en `--background/--border/--secondary/--muted/--input` (antes gris neutro 220). Los pills/inputs/tabs del dashboard heredan esto. |
| 3 | **El dashboard sigue SIEMPRE al tema global** | `frontend/src/app.ts` (`setOpenAITheme` + DOMContentLoaded) | `setOpenAITheme` escribe `dashboard-theme` y dispara `CustomEvent('gravity-theme-change')`; el dashboard aplica `.light` en reacción. **El botón "MODO OSCURO" del dashboard se ELIMINÓ** (HTML + handler + CSS); no recrear el toggle interno. |
| 4 | **Topbar con fade tipo Gemini al scroll (GLOBAL en tema claro)** | `frontend/src/dashboard.css` (`.topbar` + `::before`), `frontend/src/openai-theme.css` (~620 y scoped dashboard) | El fondo del topbar es degradado `--topbar-fade` en `::before` (sólido 55% → transparente): el contenido se disuelve al pasar debajo — **en TODAS las vistas** del tema claro (blanco), y en dashboard con violeta `hsl(258 60% 97.5%)`. `backdrop-filter: none` (el blur dibujaba rectángulo duro). En dark el fade usa `--background` (negro). Los otros overrides viejos (`#view-closer/trainer` sólidos) quedan intactos. |
| 5 | **Entrenador horizontal compacto** | `frontend/src/dashboard.css` (`@media (min-width:769px)` junto a la regla de pantalla completa) | `#view-trainer` altura fija `calc(100vh - topbar)` + orbe reescalada (290px, 240px en ventanas bajas) → los 3 controles ya no se cortan por abajo. `overflow-x: hidden` (el drawer de chat vive fuera por `translate-x-full` y generaba la barra de scroll horizontal en móvil); en ventanas muy bajas (`max-height:800px`) queda `overflow-y:auto` como scroll de seguridad. PK: la media query tiene un `@media (max-height:800px)` ANIDADO. El botón de chat abre el drawer "TRANSCRIPCIÓN EN VIVO" en móvil (verificado). |
| 6 | **Sidebar móvil: franja fantasma** | `frontend/src/dashboard.css` (media móvil) + `frontend/src/app.ts` (listener `resize`) | `.sidebar.collapsed { transform: translateX(0) !important }` anulaba el off-canvas móvil cuando el estado colapsado venía de `localStorage`. Ahora el bloque móvil fuerza `translateX(-100%) !important` y en JS un listener `resize` limpia `.collapsed` al pasar a ≤768px. |
| 7 | **Latencia del motor IA en ms (Closer + Entrenador)** | `frontend/src/views/Closer.ts`, `frontend/src/views/Trainer.ts` | Cada respuesta muestra `⏱ respondido en X ms`: en Closer via `finish(html, t0)` + tag DENTRO de `.closer-assistant-bubble` (via `renderResponse(html, tail)` — ojo: `.closer-msg` es flex-row, si el tag va FUERA de la burbuja flota a la derecha); en Trainer, `addChatMessage(role, text, id, latencyMs?)` nuevo parámetro opcional → tag `⏱ X ms` bajo el texto del asistente. Medición = request completo (transcripción+generación en `/entrenar`; delay simulado en lab: Closer ~1100ms, Trainer ~900ms). |
| 8 | **Closer: columna de texto más ancha estilo Gemini** | `frontend/index.html` (`#closer-chat`, `.closer-composer`), `frontend/src/main.css` (42rem→50rem x3) | Desktop: texto y pill ahora a `max-w-[50rem]`/`max-width:50rem` (≈800px, antes 42rem=672px). En móvil la anchura real la limita el viewport, no rompe nada. |

**Estado del sistema local**: Vite corre en segundo plano (`npm run dev` → :5173, logs en `frontend/vite_out.log`/`vite_err.log`); Flask esperable en :5001 (para IA real). Para verificar se usa `agent-browser` (sesión `sidebar-fix`) con viewport flexible (`agent-browser set viewport <w> <h>`) — lab mock (sin backend) disponible en `/lab/*`.

Verificación rápida: `/lab/dashboard` claro y oscuro, scroll para el fade del topbar, `/lab/closer-elite` (columna ancha + tag de latencia), `/lab/entrenador` a 1440×800 y 390×844 (controles completos, sin barra horizontal, chat abre). Comandos de control de calidad: `npm run typecheck` + `npm run lint`.

---

Base: `http://localhost:5173/lab`

| Vista | URL completa |
|---|---|
| Login del modo lab | `http://localhost:5173/lab` (o `/lab/login`) |
| Dashboard | `http://localhost:5173/lab/dashboard` (alias `/lab/app`) |
| Entrenador | `http://localhost:5173/lab/entrenador` |
| Closer Elite | `http://localhost:5173/lab/closer-elite` |
| Alfred AI | `http://localhost:5173/lab/alfred-ai` |
| Shadow (Copilot) | `http://localhost:5173/lab/shadow` |
| Base de conocimiento | `http://localhost:5173/lab/base-conocimiento` |
| Bienestar | `http://localhost:5173/lab/bienestar` |
| Perfil | `http://localhost:5173/lab/perfil` |
| Clients | `http://localhost:5173/lab/clients` |
| Products | `http://localhost:5173/lab/products` |

## Notas
- Definidas en `frontend/src/lib/router.ts:170-182` (`view-test-login` + vistas con callbacks `onTest*`).
- Para revisar rediseños en claro/oscuro: forzar tema con `?theme=openai` (claro) o `?theme=dark`.
- En móvil el rediseño puede probarse vía red local: `http://192.168.1.86:5173/lab/...` (URL Network que imprime Vite).
- Vite corre en segundo plano con logs en `frontend/vite_out.log` / `frontend/vite_err.log`.
- Links clickeables por cambio/campo a verificar → ver `VISUALIZAR-CAMBIOS.md`.

---

# Cambios responsive implementados (2026-09-25)

Breakpoints activos en el código (confirmados en `frontend/src`):
- `main.css:1509` y `main.css:2020` — `@media (max-width:768px) and (orientation:portrait)` (Closer vertical)
- `main.css:2041` — `@media (max-width:640px)` (tablas/dashboard interno)
- `main.css:2072` — `@media (max-width:480px)` (Closer look plano)
- `openai-theme.css:335` — portrait overrides de tema claro
- `openai-theme.css:584`, `dashboard.css:224`, `dashboard.css:1097` — `@media (max-width:768px)` genéricos

## Closer Elite (`frontend/src/views/Closer.ts` + CSS)

### Modo vertical / portrait (móvil)
- **Glow inferior continuo**: el fondo del chat se movió a `#view-closer::before` (con `isolation:isolate` + `z-index:-1`): `linear-gradient(to top)` violeta full-width con fade hasta ~55% del alto, + acentos radiales celeste/lila. Se desvanece suavemente al responder (`transition: opacity .6s`, `:has(.closer-analysis)::before { opacity:0 }`) — sin corte duro.
- **Continuidad fade ↔ composer**: `.closer-chat-fade` (disolución 72px, opacidad 0.6) empalma exacto con el fondo del composer, que arranca en la misma opacidad y sube a sólido — un solo degradado continuo de ~190px hasta el pill (verificado por muestreo de píxeles, sin saltos).
- **Sin banda en estado inicial**: el fondo del composer en portrait es condicional (`#view-closer:has(#closer-chat .closer-analysis) .closer-composer`); sin conversación queda transparente y el glow llega continuo hasta el input.
- **Altura correcta**: `#view-closer` usa `100dvh` (además de `100vh`) — en móvil `100vh` incluye la barra del navegador y generaba scroll/página movible con blanco bajo el composer. Fix: `min-height: calc(100dvh - var(--topbar-height))`.

### Modo horizontal (desktop expandido)
- **Glow unificado**: 3 radiales "desconectadas" → mismo patrón `::before` (radial superior + glow inferior amplio + acentos de esquina), con fade al responder.
- **Franja superior limpia**: el radial superior bajó de `at 50% 18%` a `at 50% 32%` → la franja superior se funde con el topbar sin marcar borde.
- **Sin solape de texto tras responder**: `.closer-composer` pasa a full-width (`.closer-sent`) con degradado sólido, fundiendo el texto que pasa por detrás.
- **Sin caja blanca tras el título**: `.closer-chat-fade` solo existe cuando hay conversación (`#view-closer:not(.closer-sent) .closer-chat-fade { display:none }`).
- **Placeholder alineado a la izquierda** en modo expandido (antes centrado).

### Móvil estrecho (480px)
- Media query actualizado para conservar el look plano Gemini: padding inline, `.closer-*` planos (sin cajas ni sombras pesadas).

## Dashboard (`frontend/src/views/` + `dashboard.css`)
- **Desborde horizontal en portrait corregido**: columnas del grid con `min-w-0` (`lg:col-span-8`/`lg:col-span-4`) → el calendario (`min-w-[620px]`) ahora scrollea internamente (`overflow-x-auto`) sin romper el layout (antes `bodyScrollW` 816 vs 390).
- **Encabezados que se apilan en móvil**: tarjetas usan `flex-col sm:flex-row` (CALENDARIO SEMANAL) y subtítulo `w-full sm:w-auto` (VISTA DEL CALENDARIO).
- **Espaciados**: grid de stats `gap-4` → `gap-5` (20px), acercándose al `gap-8` (32px) del resto; padding unificado en `.content-area` (32px).
- **Fondo continuo sin cortes** (tema claro): `.topbar` y `.content-area` toman el mismo gris del dashboard (`hsl(220 22% 96.5%)`) cuando hay dashboard visible, sin borde ni marco.

## Entrenador (móvil, Safari/Chrome iOS-Android)
- **Audio desbloqueado con gesto**: `unlockAudio()` en mousedown/touchstart del mic y botón "Empezar" (autoplay policy móvil bloqueaba `audio.play()` tras fetch async).
- **Reproducción Web Audio**: respuestas por `decodeAudioData` + `AudioBufferSourceNode` (fallback a `<audio playsInline>`) — funciona en iOS Safari.
- **Grabación compatible**: `pickAudioMimeType()` elige codec soportado (`audio/webm;codecs=opus` → ... → `audio/mp4` en iOS) vía `MediaRecorder.isTypeSupported()`.
- **Hold-to-talk estable**: Pointer Events + `setPointerCapture` (ya no `mouseleave` que cortaba la grabación con DPI escalado); mic sin `scale` en hover y `touch-action:none`.
- Orb: glow con `pointer-events:none` para no bloquear taps.

## Elementos no interactivos
- `#bg-canvas` con `pointer-events:none` (antes bloqueaba clicks en el footer).

---

# Mejoras de diseño visual (2026-09-25 → 2026-10-13)

Dirección general: **estilo Gemini** — chat limpio, planos sin cajas/sombras pesadas, paleta violeta de marca, glassmorphism sutil en controles, tema claro por defecto.

## Closer — Rediseño visual tipo Gemini
Estilos `.closer-*` en `frontend/src/main.css` + overrides en `frontend/src/openai-theme.css`:
- `.closer-analysis`: sin `backdrop-filter`, sin box-shadow pesada, sin gradiente superior; borde sutil de línea 1px. En tema claro, sombra mínima (0 1px 2px).
- `.closer-avatar`: más pequeño (30px), sin glow radial.
- `.closer-strategy::before`: número inline sin caja/borde.
- `.closer-script` / `.closer-version` / `.closer-calibrated-item`: planos, solo borde lateral izquierdo violeta (2px), sin fondo ni caja (igual en tema claro).
- Media query 480px mantiene el look plano (padding inline).

## Closer — Animaciones UX tipo Gemini
- Header/título se desvanece al enviar (`.closer-sent`), composer se desliza al fondo con Web Animations API (300ms).
- Indicador de carga: 3 puntos con gradiente violeta rebotando (sin texto, sin avatar) que se **morphiza** en la respuesta real.
- Entrada en cascada: `staggerReveal()` (80ms por bloque, tope 800ms) + `stream-in-top` en mensajes.
- Botón enviar ⇄ detener: spinner eliminado; estado loading muestra cuadrado de detener con pulso sutil.
- Velocidades ajustadas (composer drop 300ms, header fade 250ms, empty fade 220ms, stream-in 280ms, morph 250ms).
- `prefers-reduced-motion` desactiva todas las animaciones.

## Entrenador — Controles de vidrio (glassmorphism)
3 botones (`trainer-ctrl` en `index.html`, estilos en `main.css` + `openai-theme.css`):
- **Base**: `rgba(255,255,255,0.06)`, borde `rgba(255,255,255,0.14)`, `backdrop-filter: blur(16px) saturate(1.2)`, highlight interno, hover con `translateY(-2px)`.
- **Micrófono**: violeta primario de marca (`linear-gradient(160deg,#8b5cf6,#6d28d9)`) con glow — coherente con botón enviar del Closer y nav activo.
- **Cerrar**: vidrio con tinte rosa (rojo destructivo).
- **Orbe**: pulso interpolado (`+= (target - pulse) * 0.18`), suavizado ataque/liberación del volumen (0.35/0.08), radio de habla reducido (145→122) — sin saltos bruscos.

## Dashboard — Paleta y marcos
- **Fix estructural**: `<div id="lab-banner">` sin cerrar anidaba toda la app → marco negro alrededor. Cerrado en `index.html`.
- **Barras de stats**: 4 colores (cyan/azul/violeta/verde) → violeta de marca (`#7c3aed`/`#a78bfa`/`#c4b5fd`).
- **Banners de info**: azul → violeta (`violet-500`).
- **Hover de tarjetas**: borde negro → `#ddd6fe` (violeta claro).
- **Botón de tema**: claro en tema light (`#f4f4f7`, borde `#e6e6ec`).
- **Efecto tarjeta limpio** en `.light`: sombra suave (0 1px 3px) + `border-radius: 14px`.
- **Paleta de grises** (`dashboard.css` `.light`): fondo `hsl(220 22% 96.5%)`, textos `222 25% 11%`, bordes definidos `220 18% 90.5%` (antes títulos blancos ilegibles).

## Sidebar — Blanco uniforme (tema claro)
- Antes translúcido con separadores → ahora `#ffffff` opaco (expandido y colapsado), sin bordes internos, estilo Gemini.

# Sidebar colapsado — centrado del menú y su barra de iconos (2026-10-15 → 2026-10-16)

Estado final del rail comprimido (72px): caja de 44px centrada en el eje Y glifo SVG centrado dentro de su caja (offset 0px). Dos fixes encadenados — el segundo corrige lo que el primero no cubría.

## Fix 1 — Cajas del rail descentradas (2026-10-15)
- **Síntoma**: en tema claro las cajas de 44px quedaban despegadas del eje del rail (dependía de qué regla ganara la cascada: nav expandido con `flex:1`/padding, wrappers `#sidebar-mini-bottom`/`#sidebar-collapsed-toggle-wrap`).
- **Causa**: reglas heredadas del estado expandido desplazaban el nav y sus hijos dentro del rail de 72px.
- **Fix** (`dashboard.css`, bloque `.sidebar.collapsed` ~158):
  - `.sidebar.collapsed .sidebar-nav { width: 100%; box-sizing: border-box; align-self: center; scrollbar-width: none; }` + `::-webkit-scrollbar { display:none }` (la reserva de scrollbar de Windows corría todo el rail a la izquierda).
  - `margin-inline: auto` en `.nav-item` (hijos directos, anidados en `section`/`div`) y en `#sidebar-collapsed-toggle-wrap` / `#sidebar-mini-bottom` (`width:100%` + `justify-content: center`).
  - El centrado ya no depende de reglas heredadas — es blindado desde el estado colapsado.
- Verificado: offset de caja al eje del rail = 0px (claro) / ±0.5px (oscuro).

## Fix 2 — Glifo corrido -6px dentro de la caja 44px (2026-10-16)
- **Síntoma**: las cajas ya centraban, pero los SÍMBOLOS se veían "cargados a la izquierda" dentro de su caja de 44px (visible al compararlo con el toggle superior, que no tiene `<span>`). Medición exacta: el SVG quedaba a `-6px` del centro de su caja en TODOS los ítems de navegación.
- **Causa real**: el `.nav-item` **base** (modo expandido) tiene `gap: 0.75rem` (12px) para `svg + etiqueta`. En colapsado el `<span>` se oculta con `width: 0` (bloque `.sidebar.collapsed .nav-item span` ~139), **pero el gap de 12px seguía vigente** → el flex era `svg(20) + gap(12) + span(0)` y `justify-content: center` centraba ese conjunto, dejando el glifo 6px fuera del eje. Los botones sin `<span>` (toggle superior) sí quedaban centrados — por eso el desalineo se notaba al comparar.
- **Fix** (`dashboard.css`, regla `.sidebar.collapsed .nav-item` ~204): `gap: 0 !important`. Al expandir el menú la regla deja de aplicar y el gap base regresa solo (etiqueta normal con su separación).
- **Verificación en navegador** (`/lab/dashboard`, tema claro, rail colapsado):
  - `svgOffsetInBox = 0` en los 5 ítems (Dashboard, Entrenador, Closer, Base de Conocimiento, Perfil).
  - Offset de caja al eje del rail = -0.5px (subpixel, reservas de border 1px).
  - Screenshot ampliado del rail confirma los glifos sobre la línea central.

## Checklist rápido para ajustes futuros del menú colapsado
1. Toda regla de colapsado debe vivir prefijada con `.sidebar.collapsed` nunca tocar el estado expandido.
2. Si se oculta el `<span>` con `width: 0`, recordar que **el gap del flex sigue contando** — resetear `gap` o el icono descentra.
3. Medir con DevTools/eval: `getBoundingClientRect()` del `svg` vs su `.nav-item`, y del `.nav-item` vs el eje del `.sidebar` (para offsets subpixel aceptar ±0.5px).
4. Los tooltips (`::after` con `attr(data-tooltip)`) requerían liberar `overflow` en desktop colapsado — no reconducir `overflow: hidden` al rail sin comprobar la tarjetita tooltip.

## Tema claro por defecto (2026-10-13)
- `frontend/src/app.ts` (`initOpenAITheme`): sin `localStorage.gravity_openai_theme`, la app arranca en tema claro (`theme-openai`) en **todas** las vistas.
- Login del modo lab adaptado al tema claro (`openai-theme.css`: `#view-test-login` — fondo `#fafafa`, tarjeta blanca borde `#fde68a`).
- Tema oscuro intacto (reglas prefijadas con `html.theme-openai`).
- Preview/forzar: `?theme=openai` | `?theme=dark`.
