# Reglas de Puntuación

## Regla de documentación
- **Siempre** actualizar AGENTS.md al implementar cambios significativos: nuevas features, fixes estructurales, herramientas, configuraciones, o cambios en fórmulas/flujo de datos/DB.
- Si se agrega una herramienta o skill nueva, crear su propia sección documentando archivos, uso, y notas relevantes.
- Si se modifica una fórmula, trigger, o estructura de datos, reflejar el cambio aquí con fecha y contexto.
- **No omitir esta regla.** AGENTS.md es la fuente de verdad para el contexto del proyecto entre sesiones.

## Sidebar colapsado — glifo del icono corrido 6px a la izquierda (2026-10-16)
- Reporte: con el menú comprimido los símbolos quedaban "cargados a la izquierda" del rail aunque la caja de 44px estuviera centrada.
- Causa: el `.nav-item` base tiene `gap: 0.75rem` (12px, para svg + etiqueta en modo expandido). En colapsado el `<span>` se oculta con `width: 0` (líneas del bloque `.sidebar.collapsed .nav-item span`), pero el **gap de 12px seguía vigente** → el flex contenía `svg(20) + gap(12) + span(0)` y `justify-content: center` centraba ese conjunto: el glifo quedaba **-6px** fuera del eje dentro de su caja de 44px.
- Fix en `frontend/src/dashboard.css` (regla `.sidebar.collapsed .nav-item`): `gap: 0 !important`. Al expandir el menú, la regla deja de aplicar y el gap base regresa solo (etiqueta visible normal).
- Verificado en navegador (`/lab/dashboard`, tema claro): `svgOffsetInBox = 0` en los 5 ítems del rail y desvío respecto al eje del rail = -0.5px (redondeo subpíxel). Screenshot ampliado del rail confirma los glifos centrados.

## Closer — Rediseño visual tipo Gemini (2026-09-25)
Estilos `.closer-*` en `frontend/src/main.css` + overrides en `frontend/src/openai-theme.css` aplanados hacia un chat limpio:
- `.closer-analysis`: sin `backdrop-filter`, sin `box-shadow` pesada, sin gradiente superior de 2px; borde sutil y línea de 1px centrada. En tema claro, sombra mínima (0 1px 2px).
- `.closer-avatar`: más pequeño (30px), sin glow radial.
- `.closer-user-bubble`: padding/radius ajustados, sombra suave.
- `.closer-playbook-title`: fuente 13px, tracking 0.14em (más limpio).
- `.closer-strategy::before`: número inline sin caja/borde.
- `.closer-script` / `.closer-version` / `.closer-calibrated-item`: planos, solo borde lateral izquierdo violeta (2px), sin fondo ni caja. Igual en tema claro (`openai-theme.css`).
- `.closer-divider`: gris neutro más sutil.
- Media query 480px actualizado para conservar el look plano (padding inline).

Verificado: `npx tsc --noEmit` limpio, `npx eslint src/views/Closer.ts` limpio, llaves CSS balanceadas.

## Closer — Animaciones UX tipo Gemini (2026-09-25)
Mejoras de experiencia de usuario en el flujo Closer (`frontend/src/views/Closer.ts`, `frontend/index.html`, `frontend/src/main.css`):
- **Estado vacío poblado**: `#closer-empty` ahora muestra un orb flotante (`.closer-empty-orb`, ya definido en CSS pero sin uso) + texto de ayuda. Al enviar la primera consulta, se desvanece con fade+slide (`.closer-empty-leaving`) antes de ocultarse.
- **Header/título "¿Qué objeción tienes hoy?"**: al generarse la respuesta, `#view-closer` recibe `.closer-answered` y el header se desvanece (opacity 0 + translateY/scale con `cubic-bezier(0.22,1,0.36,1)`).
- **Composer se desliza al fondo**: al renderizar la respuesta, se mide el rect del `.closer-composer` antes/después del cambio de layout (`:has()` ancla sticky bottom) y se anima el desplazamiento con Web Animations API.
- **Morph del indicador**: el bubble "Analizando objeción..." (`closer-thinking`) ya no queda parpadeando; su `.closer-msg` se reemplaza en sitio con la respuesta real (`.closer-replaced` anima la entrada). En error, el indicador se elimina.
- **`.stream-in-top` activado** (antes `animation: none`): los mensajes entran con fade+slide.
- `prefers-reduced-motion` ahora también desactiva `.closer-replaced`, `#closer-empty` y sus transiciones.

### Ajuste de velocidad (2026-09-25)
- El pill del input pasó de `transition-all duration-300` a `transition-[border-color,box-shadow] duration-150`: ya NO anima el alto al crecer el textarea mientras escribes (antes se sentía lento y rompía el layout).
- Tiempos: composer drop 300ms (antes 620ms), header fade 250ms (antes 500ms), empty fade 220ms (antes 450ms), stream-in 280ms (antes 400ms), morph 250ms (antes 350ms). Timeout de ocultado del empty: 280ms.
- El orb + texto del estado vacío se retiraron del HTML el mismo día (decisión del usuario); `.closer-empty-orb` quedó como CSS sin uso (puede limpiarse después).

### Overlap y carga (2026-09-25)
- **Sin caja debajo del input**: `.closer-composer` quedó con `background: transparent` en ambos temas (antes se había puesto opaco y generaba una caja blanca/oscura bajo el pill; el usuario pidió quitarla). El ocultado del texto que pasa detrás lo hace `.closer-chat-fade` (gradiente al fondo del tema: blanco en `theme-openai`, oscuro por defecto) + pills sólidos (`.closer-input` opaco, blanco en claro / `rgba(8,8,16,0.97)` en oscuro).
- **Indicador de carga tipo Gemini**: el bubble "Analizando objeción..." ya no muestra texto; queda solo el indicador `.closer-thinking` (3 puntos animados) para dejar el espacio en blanco mientras carga, y luego se morphiza en la respuesta.

### Flujo organizado tipo Gemini (2026-09-25)
Secuencia completa Enter → respuesta, según el flujo de Gemini (indicador visible, botón detener, transición al enviar):
1. **Enter**: burbuja del usuario entra con `stream-in-top`; se limpia el input; `#view-closer` recibe `.closer-sent`.
2. **Al enviar** (`.closer-sent`): el header/título se desvanece y el composer baja al fondo con animación (WAAPI 300ms). Antes esto ocurría al llegar la respuesta; ahora ocurre al enviar (como Gemini). El header además colapsa su `margin-top` a 0, de modo que la frase del usuario y el indicador de carga quedan **ARRIBA** (como Gemini), no centrados.
3. **Carga**: `.closer-thinking` = 3 puntos con gradiente violeta (8px) rebotando, sin texto y **sin avatar** (se quitó el `.closer-avatar-ai` del indicador y de la respuesta, estilo Gemini). El **botón de enviar se convierte en botón de DETENER** (cuadrado, `setButtonState`): se puede pulsar para abortar (`stopGeneration` → `AbortController.abort()`; en modo lab cancela el timeout y quita el indicador). El input queda limpio.
4. **Respuesta**: el indicador se morphiza en la respuesta y `staggerReveal()` revela los bloques en cascada (80ms c/u, tope 800ms).
5. **Scroll**: al morph y a los 1100ms para el último bloque.

Notas de implementación:
- `:has(#closer-chat .closer-analysis)` se reemplazó por `.closer-sent` en los CSS (glow, header, composer, chat-fade) para que la transición sea **al enviar**.
- El botón ya no usa spinner; el estado `is-loading` muestra el cuadrado de detener (con un pulso sutil `closerStopPulse`). Se corrigió que antes el spinner no se restauraba en la ruta de éxito.
- `prefers-reduced-motion`: `.closer-reveal` queda `opacity:1` sin animación.

### Degradado en modo vertical (2026-09-25)
- **Antes**: el glow inferior era una elipse radial `at 50% 100%` con corte a 62%, lo que producía un "corte fuerte" en la parte inferior (el violeta aparecía de golpe en ~40px y tenía borde duro). Además, al llegar la respuesta el fondo se eliminaba de golpe.
- **Ahora**: en `@media (max-width:768px) and (orientation:portrait)` el glow se movió a `#view-closer::before` (`isolation:isolate` + `z-index:-1`) con:
  - `linear-gradient(to top)` violeta a todo el ancho (fade suave hasta ~52% alto) + dos radiales celeste/lila sutiles como acentos → sin borde de elipse.
  - `transition: opacity .6s` y `:has(.closer-analysis)::before { opacity: 0 }` → el fondo se desvanece suavemente al responder (sin corte brusco).
- `#view-closer { background: transparent }` en vertical (dark) / `#ffffff` (openai). Ajustado en `main.css` y `openai-theme.css`.
- **Fade del input**: `.closer-chat-fade` quedó como disolución SUTIL de 72px, `linear-gradient(to top, rgba(fondo,0.6) 0%, transparent 100%)` (blanco en claro / `rgba(8,8,16,0.6)` en oscuro). Evita que se vea como una "caja blanca" sobre el input (se probaron 120px con 0.98 de opacidad y el usuario reportó que parecía una caja; se bajó a fade suave).
- **Glow inferior vertical (ajustes 2026-09-25)**: el glow del `#view-closer::before` era demasiado tenue (0.03–0.05 sobre blanco → "no se apreciaba") y el pill blanco interrumpía el glow que reaparecía fuerte debajo de la caja ("se veía cortado"). Fix: se subió la intensidad del `::before` (lineal violeta `0.42→0.20` en oscuro / `0.34→0.16` en claro hasta transparente ~55%) y el `.closer-composer` en portrait quedó con fondo `linear-gradient(to top, #000/#fff 0%, 0.9 40%, transparent 100%)` (requiere `!important` en `openai-theme.css` por la base transparent). Así el glow se aprecia en el área del chat y se funde limpiamente en el área del input, sin corte ni caja (en portrait el composer es full-width).
- **Corte del fade (fix 2026-09-25)**: había un salto duro en `y=726` (borde superior del composer) porque `.closer-chat-fade` terminaba en opacidad `0.6` y el composer arrancaba en `0` (el violeta pasaba de `240,237,254` a `219,211,252` de golpe). Fix: el composer ahora arranca arriba en la MISMA opacidad que el fade (`linear-gradient(to top, #fff/#000 0%, rgba(base,0.6) 100%)`), quedando un único degradado continuo de ~190px (fade 0→0.6 + composer 0.6→1.0). En oscuro se igualó la base a `rgba(8,8,16,0.6)` para empalmar exacto con `.closer-chat-fade`. Verificado por muestreo de píxeles: y=724 y y=728 idénticos en ambos temas.
- **Banda en el estado inicial (fix 2026-09-25)**: en vertical, el fondo blanco/negro del composer creaba una banda horizontal visible justo encima del input (salto de ~25 en el canal rojo en y=726) porque el composer estaba opaco aunque no hubiera conversación. Fix: el fondo del composer en portrait ahora es condicional a que exista `.closer-analysis` (`#view-closer:has(#closer-chat .closer-analysis) .closer-composer { background: ... }`); en el estado inicial queda transparente y el glow llega continuo hasta el pill. Verificado por muestreo: el gradiente es continuo hasta el borde del pill (d ≤ 4) en claro y oscuro.
- **Diseño que se movía hacia arriba en móvil (fix 2026-09-25)**: `#view-closer` usaba `min-h-[calc(100vh-var(--topbar-height))]`; en móvil `100vh` incluye la barra del navegador, así que la sección era más alta que el viewport visible → la página se podía desplazar y revelaba blanco bajo el composer. Fix en `main.css`: `#view-closer { min-height: calc(100vh - var(--topbar-height)); min-height: calc(100dvh - var(--topbar-height)); }` (dvh = viewport visible). Desktop sin cambios (dvh == vh).

### Modo horizontal (fix 2026-09-25)
- **Glow unificado**: el fondo horizontal eran 3 radiales que se veían como "manchas" desconectadas y no se desvanecían al responder. Se movió a `#view-closer::before` (mismo patrón que vertical) con un radial superior + glow inferior amplio + dos acentos de esquina, y `transition: opacity .6s` + `:has(.closer-analysis)::before { opacity: 0 }` para que el glow se desvanezca suave al responder.
- **Barra superior invisible**: el radial superior estaba en `at 50% 18%` y llegaba hasta el topbar, marcando el borde. Se bajó a `at 50% 32%` (48% alto) → la franja superior (~8%, ~64px) queda blanca/negra y se funde con el topbar (verificado: y=67 ≈ `254,253,255` en claro; negro puro en oscuro).
- **Sin solape de texto tras responder**: el composer en modo expandido era `max-width: 42rem` y transparente, así que el texto se veía detrás. Ahora, con `.closer-sent`, el composer pasa a `max-width: none` (full-width) con fondo `linear-gradient(to top, #fff/#000 0%, rgba(base,0.6) 100%)` (el pill sigue centrado a 42rem por la regla existente de `.closer-input`), de modo que el texto que pasa por detrás se funde en el fondo. Ajustado en `main.css` (oscuro) y `openai-theme.css` (claro, con `!important`).
- **Caja blanca detrás del título (fix 2026-09-25)**: en el estado inicial el `.closer-chat-fade` (672px, blanco) se posiciona `bottom: 100%` del composer; como el composer está centrado, el fade caía detrás del título y se veía como un rectángulo blanco con bordes que tapaba el glow. Fix: `#view-closer:not(.closer-sent) .closer-chat-fade { display: none; }` — el fade solo aparece cuando hay conversación.
- **Placeholder a la izquierda (2026-09-25)**: en modo expandido el textarea estaba `text-align: center` (y `justify-content: center`); se cambió a `text-align: left` + `justify-content: flex-start` para que el texto sugerido del box quede a la izquierda.

Verificado: `npx tsc --noEmit` limpio, `npx eslint src/views/Closer.ts` limpio, flujo lab probado en navegador (carga + cascada + 2 consultas seguidas) en viewport móvil portrait (390×844) tema claro y oscuro.

## Dashboard — paleta y marcos (2026-09-25)
El dashboard en tema claro tenía colores fuera de paleta y "marcos negros". Fixes:
- **Fondo negro alrededor del contenido (fix estructural IMPORTANTE)**: en `index.html` el `<div id="lab-banner" class="hidden">` **nunca se cerraba**, así que **toda la app (`#app-container`) quedaba anidada dentro de él**, y el fondo negro del banner (`html.theme-openai #lab-banner { background:#0d0d0d !important }`) se veía como un marco negro alrededor del dashboard. Fix: cerrar el div (`<div id="lab-banner" class="hidden"></div>`). Verificado: `#app-container` ahora es hijo de `body`, `lab-banner` con alto 0.
- **Barras de las tarjetas de estadísticas** (`StatCards.ts`): pasaron de 4 colores (cyan/azul/violeta/verde) a **violeta de marca** (`#7c3aed`/`#a78bfa`/`#c4b5fd`) — coherente con los iconos (`text-primary`).
- **Botón de tema** (`openai-theme.css`): `html.theme-openai .theme-dashboard-toggle` ahora es claro (`#f4f4f7`, borde `#e6e6ec`, texto `#4b5563`) — antes quedaba oscuro / con marco negro.
- **Hover de tarjetas** (`openai-theme.css`): `border-color` pasó de `#0d0d0d` (negro) a `#ddd6fe` (violeta claro).
- **Banner de info** (`index.html`, ambas ocurrencias usuario/admin): de azul (`blue-500`) a violeta (`violet-500`) con icono `text-white`.
- Nota: el dashboard claro usa la clase `.light` en `#view-dashboard` (toggled en `app.ts:249`) que define las variables `--foreground/--card-foreground/--border/...`; sin esa clase los títulos quedan blancos (ilegibles).
- **Espaciados y efecto limpio (2026-09-25)**: se quitó el `pt-6` extra de `#view-dashboard` (el padding queda solo en `.content-area` = 32px); el grid de stats pasó de `gap-4` (16px) a `gap-5` (20px) para acercarlo al `gap-8` (32px) del resto; y se añadió a `dashboard.css` un efecto de tarjeta limpio en `.light` (`box-shadow: 0 1px 3px rgba(16,24,40,.05), 0 1px 2px rgba(16,24,40,.03)` + `border-radius: 14px`).
- **Paleta de grises y contraste (2026-09-25)**: variables `.light` ajustadas en `dashboard.css` — `--background` de `0 0% 98%` a `220 22% 96.5%` (gris suave para que las tarjetas blancas resalten), `--foreground` a `222 25% 11%`, `--card-foreground` a `222 22% 16%`, `--border` a `220 18% 90.5%` (borde definido), `--secondary`/`--muted`/`--input` aclarados a `220 20% 95.5-96.5%` (superficies grises más suaves), y `--muted-foreground` a `220 14% 40%` (textos secundarios legibles).
- **Sin corte arriba / fondo continuo (2026-09-25)**: el `.topbar` era blanco y el contenido del dashboard gris, creando un corte horizontal. Fix en `openai-theme.css`: cuando el dashboard está visible (`body:has(#view-dashboard:not(.hidden))`, también admin), `.topbar` y `.content-area` toman el mismo gris que el dashboard (`hsl(220 22% 96.5%)`), sin borde ni backdrop → fondo continuo y sin marco.
- **Adaptación vertical (2026-09-25)**: en portrait el dashboard desbordaba horizontalmente (`bodyScrollW 816` vs `390`) porque los ítems del grid tenían `min-width: auto` y el calendario (`min-w-[620px]`) estiraba la columna. Fix: `min-w-0` en las columnas `lg:col-span-8`/`lg:col-span-4` → el calendario ahora scrollea internamente (`overflow-x-auto`) sin romper el layout. Además los encabezados de las tarjetas se apilan en móvil (`flex-col sm:flex-row` en CALENDARIO SEMANAL; subtítulo `w-full sm:w-auto` en VISTA DEL CALENDARIO).

## Sidebar — blanco degradado sutil (2026-09-25)El sidebar en tema claro (`theme-openai`) tenía saltos de color: era translúcido (`rgba(255,255,255,0.78)`) y el `.sidebar-nav` `rgba(255,255,255,0.86)`, así que el fondo de la app se transparentaba distinto en header/nav/footer. Además había líneas separadoras (`border-bottom` en `.sidebar-header`/`.sidebar-nav` y `border-top` en `#sidebar-full-bottom`).
Fix en `openai-theme.css`:
- `html.theme-openai .sidebar { background: linear-gradient(180deg, #ffffff 0%, #f7f7fb 100%) !important; }` (opaco, degradado sutil).
- `html.theme-openai .sidebar-nav { background: transparent !important; }`.
- Bordes de header/nav/footer a `transparent` para dejar un degradado continuo (como el sidebar de Gemini).
- **Blanco sólido uniforme (2026-09-25)**: se reemplazó el degradado por `background: #ffffff !important` (expandido) y el colapsado (`.sidebar.collapsed` + sus wrappers `#sidebar-collapsed-toggle-wrap`/`#sidebar-full-bottom`/`#sidebar-mini-bottom`/`.sidebar-header`/`.sidebar-nav`) también a blanco opaco sin bordes internos. Evita variaciones de gris en el menú colapsado.
- **Colapsado uniforme (2026-09-25)**: `.sidebar.collapsed` era translúcido (`rgba(255,255,255,0.92)`) y dejaba ver el fondo gris de detrás (topbar/app) como bandas arriba/abajo. Fix: `background: #ffffff !important` (blanco opaco uniforme).
No afecta al tema oscuro (reglas con `html.theme-openai`).

## Entrenador — Controles de vidrio (2026-09-25)
Los 3 botones del Entrenador (transcripción, micrófono, cerrar) se rediseñaron con estilo glassmorphism (elegante y translúcido):
- Se agregó la clase `trainer-ctrl` a los 3 botones en `index.html` (y `id="trainer-chat-btn"` al de transcripción).
- Base (oscuro) en `main.css`: `.trainer-ctrl` con `background: rgba(255,255,255,0.06)`, `border: 1px solid rgba(255,255,255,0.14)`, `backdrop-filter: blur(16px) saturate(1.2)`, sombra suave + highlight interno; hover con `translateY(-2px)`.
- Micrófono (`#trainer-mic-btn`): **violeta primario de la marca** (`linear-gradient(160deg,#8b5cf6,#6d28d9)`) con glow violeta — coherente con el resto de la app (botón enviar del Closer, nav activo).
- Cerrar (`#trainer-exit-btn`): vidrio con tinte rosa.
- Tema claro en `openai-theme.css` (con `!important`): glass claro (`rgba(15,23,42,0.035)`), mic violeta con glow, exit con tinte rosa.

Paleta: neutro (transcripción) / violeta primario (micrófono) / rojo destructivo (cerrar).

Posición: el contenedor de controles lleva `mt-auto` para anclarse al fondo del `#view-trainer` (flex column) cuando sobra espacio (pantallas altas), quedando a `pb-6` (24px) del borde inferior.

### Orbe — animación suavizada al hablar (2026-09-25)
El orbe reaccionaba al volumen de forma brusca: `orb.audioVolume = average/128` sin filtrar y al cambiar de estado se ponía a `0` de golpe → la animación se veía "cortada". Fix en `Trainer.ts`:
- `startVolumeLoop()`: suavizado ataque/liberación (`k = 0.35` al subir, `0.08` al bajar) en vez de asignar el valor crudo; el loop sigue mientras habla o mientras el volumen decae a 0 (no se corta al cambiar de estado).
- `analyser.smoothingTimeConstant = 0.85` en `startAudioVisualizer` y `playResponseAudio`.
- `ParticleOrb.animate()`: el `pulse` ahora se interpola (`this.pulse += (targetPulse - this.pulse) * 0.18`) para no saltar entre estados.
- **IA hablando más controlado**: en `speaking` el radio base bajó de `145` a `122` y el pulso usa `audioVolume * 24` (antes `*60`, compartido con listening); `listening` quedó en `audioVolume * 45`. Así la esfera no crece tanto cuando habla la IA.

Verificado en navegador en tema claro y oscuro (`/lab/entrenador`).

## Entrenador
El tiempo se contabiliza según los minutos efectivos de entrenamiento.
- 1 minuto de entrenamiento = 1 minuto registrado

### Cálculo de duration_sec
Se mide por ciclo pregunta→respuesta:
1. Usuario presiona micrófono → inicia el ciclo
2. Habla → suelta → se procesa el audio
3. IA responde → termina el ciclo

`duration_sec` = suma de todos los ciclos activos dentro de la sesión
- Mínimo: 60s (lo fuerza el frontend)
- Máx por sesión: 3600s (cap en el trigger, evita timers dejados abiertos)
- `started_at` / `ended_at` = ventana de la sesión, no horas continuas
- NO mide tiempo de página abierta, solo interacciones activas micrófono→respuesta

## Closer
Cada consulta realizada al Closer equivale a tiempo registrado.
- 1 consulta = 30 segundos
- 2 consultas = 1 minuto registrado

## Quizz (pregunta respondida seleccionando una de las alternativas disponibles)
Cada quizz completado también suma tiempo registrado.
- 1 quizz respondido = 30 segundos
- 2 quizz respondidos = 1 minuto registrado

---

## Persistencia en Supabase

### daily_metrics.training_minutes
```sql
training_minutes =
  FLOOR(SUM(LEAST(block_duration_sec, 3600)) / 60)   ← entrenador (bloques de conversación, cap 1h)
  
total_minutes =
  training_minutes
  + FLOOR(closer_count * 30 / 60)                      ← closer
  + FLOOR(quiz_answers * 30 / 60)                      ← quiz
```

### Flujo de datos
1. **Frontend** → INSERT en `training_sessions` (user_id, started_at, ended_at, duration_sec)
2. **Trigger** `sync_daily_metrics_on_training` → recalcula usando `messages`:
   - Agrupa mensajes en bloques por gaps >30min (conversaciones separadas)
   - Cada bloque se mide desde el primer hasta el último mensaje
   - Bloques >3600s se capean a 3600s
   - `training_minutes = conv_blocks_capeados + closer + quiz`
3. **Frontend** → `saveCloserUsage()` incrementa `closer_count`
4. **Frontend** → quiz incrementa `quiz_answers`. **Contenido solo-lectura** (sin preguntas) también suma: 1 item visto = 30 segundos, usando el mismo `increment_daily_quiz_answer`
5. **NOTA**: `saveSession()` ya NO actualiza `daily_metrics` manualmente
   (el doble conteo se eliminó el 2026-07-11)

### Correcciones aplicadas (2026-07-11)
- Trigger `sync_daily_metrics_on_training` actualizado con cap de 3600s
- `daily_metrics.training_minutes` recalculados desde 2026-05-08
- Fórmula: trainer (capeado) + closer + quiz
- Frontend `supa-client.ts:saveSession` limpiado (eliminado doble conteo)
- Timer de entrenamiento cambiado de continuo a por-interacción (app.ts/Trainer.ts)

### Correcciones aplicadas (2026-07-15) — Sesión 1: Scoring & DB
- `increment_daily_quiz_answer()`: fixed `text`→`date` type mismatch (PostgreSQL 17 no permite insertar `text` en columna `date`)
- `getCompanyDailyMetrics()`: agregado `quiz_answers` al SELECT (faltaba, admin veía 0)
- `getCurrentStreak()`: incluye `quiz_answers` en select y filtro de días activos
- `Dashboard.ts` ranking: `totalMinutes` ahora incluye `closer_count` y `quiz_answers`
- `Math.round`→`Math.floor` en todos los cálculos de closer/quiz (Dashboard, WeeklyCalendarGrid, StatCards, WeeklyRanking)
- `Knowledge.ts`: fallback a `moduleQuestions.length` cuando `_modulesCache` es null
- `recalculate_daily_metrics()`: actualizado con block detection + cap 3600s + preserva `quiz_answers`
- `is_admin()`: agregado `SECURITY DEFINER SET search_path = public` (riesgo RLS recursion)
- `knowledge_content`: agregado UNIQUE `(company_id, module, orden)` + seed con `ON CONFLICT DO NOTHING`
- Closer trigger: `AFTER INSERT` → `AFTER INSERT OR UPDATE`
- `messages.created_at` y `conversations.created_at`: convertidos a `timestamptz`
- `backend/data/__init__.py` + `knowledge_data.py`: creados para imports rotos en tools
- `frontend/__tests__/scoring.test.js`: 26 tests de fórmulas y streak

### Correcciones aplicadas (2026-07-15) — Sesión 2: Backend Fase 1-3

#### Fase 1 — Seguridad
| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `backend/core/config.py` | Eliminado query-param `?user_id=` (suplantación). `get_user_id()` solo acepta JWT. Agregado `get_user_role()` compartido |
| 2 | `backend/routes/knowledge_routes.py` | Endpoint `/conocimiento/admin` ahora requiere `admin`/`super_admin` vía `_require_admin()`. Read-only endpoints mantienen fallback service-role |
| 3 | `backend/routes/invitation_routes.py` | Eliminado `get_user_role()` local, importa de `core.config` |
| 4 | `backend/routes/company_routes.py` | Eliminado `get_user_role()` local, importa de `core.config`. Helpers `require_super_admin`/`require_admin` actualizados |
| 5 | `.gitignore` + `git rm --cached` | `tools/get_keys.py`, `check_supa.py`, `fix_supa_config.py` fuera del tracking (tenían token hardcodeado `sbp_d8c2a...`) |

#### Fase 2 — Correctitud
| # | Archivo | Cambio |
|---|---------|--------|
| 6 | `backend/services/openai_service.py` | Threads de OpenAI se eliminan en `finally` (fuga de recursos) |
| 7 | `backend/routes/training_routes.py` | `import langdetect` movido al tope del archivo (evita recarga 200-500ms por request) |
| 8 | `backend/data/__init__.py` + `knowledge_data.py` | Stub `KNOWLEDGE_BASE_DB = {}` para tool scripts que importan `data.knowledge_data` |

#### Fase 3 — Robustez
| # | Archivo | Cambio |
|---|---------|--------|
| 9 | `backend/routes/training_routes.py` | TTS replace con `re.sub(..., re.IGNORECASE)` — cubre `"ok"`, `"Ceo"`, `"leads"` etc. |
| 10 | `backend/core/config.py` + 4 archivos | `"gpt-5.4-mini"` extraído a `config.openai_model` (env `OPENAI_MODEL`). 5 ocurrencias en 4 archivos actualizadas |
| 11 | `backend/routes/training_routes.py` | Validación `len(text) > MAX_INPUT_LENGTH` (4000 chars) retorna error 400 |
| 12 | `backend/routes/knowledge_routes.py` | POST body validado con campos requeridos (`module`, `module_title`, `concepto`, `enseñanza`, `ejemplo`, `pregunta`, `respuesta`) |
| 13 | `backend/routes/training_routes.py` | Auto-creación de perfil eliminada. Si no existe el perfil, retorna 400 |

### Correcciones aplicadas (2026-07-15) — Sesión 3: Frontend audit
- `frontend/src/views/Dashboard.ts:158`: Fórmula `pts` del ranking admin corregida. Antes: `(tr * 60) + (cl * 60) + (qz * 30)`. Ahora: `tr + Math.floor(cl * 0.5) + Math.floor(qz * 0.5)` (minutos reales por AGENTS.md)

---

## Conocimiento por empresa (Tenant-based Knowledge)

### Objetivo
Reemplazar `KNOWLEDGE_BASE_DB` global por conocimiento por empresa. El contenido original pertenece a Falabella. Cada company admin gestiona su propia base desde el panel.

### Work State
**Completed** (2026-07-11):
- `20260711_create_knowledge_content.sql`: tabla `knowledge_content` con `company_id`, RLS (super_admin/company_admin/user)
- `backend/routes/knowledge_routes.py`: endpoints `/conocimiento/modulos`, `/conocimiento`, `/conocimiento/admin` CRUD
- `frontend/src/views/Knowledge.ts`: módulos dinámicos por API, filtro por company_id
- `frontend/src/views/AdminKnowledge.ts`: CRUD completo con modales item/módulo, soporte super_admin + company_admin
- `frontend/index.html`: nav links, vista `view-admin-knowledge`, modales
- `frontend/src/lib/router.ts`: rutas `/admin/knowledge`, `/knowledge-admin`
- `frontend/src/app.ts`: handler `onAdminKnowledge`
- Seed de 168 items de Falabella insertado exitosamente (40+40+40+48)
- `backend/tools/generate_knowledge_migration_v2.py`: generador de seed SQL con `jsonb_build_array`
- `backend/tools/seed_knowledge_falabella.py`: seed via Python/supabase-client

**Blocked**: N/A (todo funcional)

### Pendiente
- Probar flujo completo: crear empresa nueva → agregar items desde admin → ver en Knowledge.ts

---

## Hardcoded Module Totals (IMPORTANTE)

Los totales de preguntas por módulo están **hardcodeados** en estos archivos del frontend:

| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| `frontend/src/api/supa-client.ts` | 195-200, 216-221, 279 | `getKnowledgeProgress()`, `getKnowledgeAnsweredCount()`, `getWeeklyLeaderboard()` |

```ts
const MODULE_TOTALS: Record<string, number> = {
  'el-camino-del-lobo': 40,
  'rompe-la-barrera-del-no': 40,
  'ventas-spin': 40,
  'las-48-leyes-del-poder': 48,
};
const GRAND_TOTAL = 168;
```

Si un **company admin** agrega un nuevo módulo desde el panel `/admin/knowledge`, estos totales **no se actualizan automáticamente**. El progreso y leaderboard del frontend mostrarán valores incorrectos hasta que se actualicen estos hardcodeos.

### Solución futura sugerida
Reemplazar los `MODULE_TOTALS` hardcodeados por un endpoint `/conocimiento/totales` que retorne `{ module: total }` desde la tabla `knowledge_content`:
```sql
SELECT module, COUNT(*) as total FROM knowledge_content WHERE company_id = $1 GROUP BY module;
```

---

## Fórmulas de visualización (Frontend)

Cada vez que se muestran `closer_count` o `quiz_answers` en el frontend, se aplica:
```
minutos = FLOOR(valor * 0.5)
```
Porque 1 unidad = 30 segundos = 0.5 minutos (por AGENTS.md).

**Regla:** Siempre usar `Math.floor()`, **nunca `Math.round()`**. `Math.floor` alinea con `FLOOR` de PostgreSQL y evita sobrecontar valores impares (ej: 1 closer → 0 min, no 1 min).

### Archivos que implementan esta conversión
| Archivo | Líneas clave |
|---------|-------------|
| `Dashboard.ts:304-318` | Modo closer/quizz en stats |
| `WeeklyCalendarGrid.ts:17-19` | `computeValue()` |
| `StatCards.ts:38-39` | `dailyAvgSeries` |
| `StatCards.ts:48-49` | Labels de consultas/quizz |
| `WeeklyRanking.ts:22,29` | Ranking semanal |
| `supa-client.ts:309` | Leaderboard

---

## Correcciones aplicadas (2026-07-15) — Sesión 4: Navegación & DB

### Router y subpáginas
| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `router.ts` | Agregadas rutas `/request-demo`, `/privacy`, `/terms`, `/contact` apuntando a `view-landing` con callbacks |
| 2 | `router.ts` | `_showView` ahora oculta `#app-container` cuando la vista es `view-landing` (sidebar no aparece) |
| 3 | `router.ts` | `_handleLinkClick` ya no intercepta links con `href` que empiezan con `#` (anclas nativas funcionan) |
| 4 | `app.ts` | `onRouteChange` reconoce `landingSubpages` y no ejecuta `appContainer.classList.remove('hidden')` |
| 5 | `app.ts` | `onRouteChange` para `/` ahora llama `hideLandingSubpages()` y restaura `<main>` |
| 6 | `app.ts` | `handleSessionSuccess` no muestra `app-container` si la ruta actual es subpágina |
| 7 | `app.ts` | Navegación a `/#problema`, `/#modulos` etc. hace scroll vía `scrollIntoView` con delay |
| 8 | `main.css` | `#bg-canvas` agregado `pointer-events: none` (no bloqueaba clicks en footer) |
| 9 | `index.html` | Nav links cambiados de `#problema` a `/#problema` (funcionan desde subpáginas) |
| 10 | `index.html` | Creadas páginas `/privacy`, `/terms`, `/contact` como subpáginas del landing |
| 11 | `index.html` | Footer links actualizados con hrefs reales; eliminado link "Blog" |

### DB — `training_minutes` doble conteo
- `training_minutes` en BD ya incluye `FLOOR(closer_count * 0.5) + FLOOR(quiz_answers * 0.5)` por el trigger `sync_daily_metrics_on_training`
- El frontend NO debe volver a sumarlos. `pts = tr` (no `tr + Math.floor(cl * 0.5) + Math.floor(qz * 0.5)`)
- Archivos afectados:
  - `Dashboard.ts:158`: `pts = tr` (corregido)
  - `Dashboard.ts:335`: `totalMinutes += (m.training_minutes || 0)` (corregido)
  - `WeeklyCalendarGrid.ts:19`: `return (entry.training_minutes || 0)` (corregido)
  - `WeeklyRanking.ts:22`: `totalMinutes += training` (corregido)
  - `supa-client.ts:314`: leaderboard (`points: me + FLOOR(mcl*0.5) + FLOOR(mc*0.5)`) — `mcl` (closer) está doble contado porque training_minutes ya lo incluye. `mc` (quiz de knowledge_progress) es fuente diferente y está correcto.
  - `backend/db/migrations/20260301_daily_metrics_closer_count.sql`: trigger incluye quiz/closer

### DB — Funciones actualizadas
- `increment_daily_quiz_answer(uuid)`: ahora recalcula `training_minutes = block_minutes + FLOOR(closer * 0.5) + FLOOR(quiz * 0.5)`
- `sync_daily_metrics_on_closer()` trigger: ahora recalcula `training_minutes` completo (antes solo actualizaba `closer_count`)

### Regla importante
`total_minutes` en `daily_metrics` es el total combinado (training_minutes + closer + quiz).
`training_minutes` ahora almacena solo los minutos de bloques de /entrenador.
El frontend usa `total_minutes` para rankings/leaderboard y `training_minutes` para el modo "Entrenamiento" del calendario.

### Estructura actual de daily_metrics
| Columna | Contenido |
|---------|-----------|
| `training_minutes` | Bloques de conversación de /entrenador (capped 3600s, gaps >30min) |
| `closer_count` | Consultas al Closer |
| `quiz_answers` | Quizzes respondidos + contenido visto (1 item = 30s) |
| `total_minutes` | training_minutes + FLOOR(closer×0.5) + FLOOR(quiz×0.5) |
| `sessions` | Sesiones de entrenamiento |

### Cálculo de total_minutes (trigger y funciones)
```sql
total_minutes = training_minutes + FLOOR(closer_count * 0.5) + FLOOR(quiz_answers * 0.5)
```

### Archivos frontend actualizados
| Archivo | Cambio |
|---------|--------|
| `Dashboard.ts` | `pts = m.total_minutes`, ranking usa `total_minutes` |
| `WeeklyRanking.ts` | `totalMinutes += dayData.total_minutes` |
| `supa-client.ts` | SELECTs incluyen `total_minutes`, leaderboard lo usa |
| `WeeklyCalendarGrid.ts` | modo 'training' usa `training_minutes` (solo bloques)  |

### DB Functions
- `increment_daily_quiz_answer`: solo modifica `quiz_answers` y `total_minutes` (no toca `training_minutes`)
- `sync_daily_metrics_on_closer`: solo modifica `closer_count` y `total_minutes`
- `sync_daily_metrics_on_training`: `training_minutes` = bloques, `total_minutes` = combinado
- `recalculate_daily_metrics`: bug corregido (subquery múltiples filas), ahora incluye `total_minutes`

---

## Correcciones aplicadas (2026-07-15) — Sesión 5: Scoring & Contenido

### Contenido solo-lectura suma minutos
| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `Knowledge.ts:181-188` | `markItemSeen()` ahora pasa `isNew` a `syncProgressToSupabase`. Si es ítem nuevo, llama `recordDailyQuizAnswer()` = +30s por contenido visto |
| 2 | `Knowledge.ts:330` | `syncProgressToSupabase(recordQuizAnswer)` conserva el flag para decidir si incrementa quiz_answers |

### Regla de puntuación
- **Contenido solo-lectura** (módulos sin preguntas): 1 item visto = 30 segundos = 0.5 minutos
- Usa el mismo `increment_daily_quiz_answer` que los quizzes
- `markItemSeen()` solo suma en la primera vez que se ve el item (controla con `isNew`)

### Recalcular datos históricos
```sql
UPDATE daily_metrics SET training_minutes = 
  COALESCE(/* block_minutes */, 0) + FLOOR(quiz_answers * 0.5)::integer + FLOOR(closer_count * 0.5)::integer
WHERE user_id IN ('...');
```
**Nota:** `recalculate_daily_metrics(uuid)` tiene un bug (subquery retorna múltiples filas al hacer JOIN con closer_usage). Si se necesita recálculo global, corregir primero la función.

---

## Correcciones aplicadas (2026-08-13) — Assistant no se consultaba en /entrenar

### Contexto
El Assistant de OpenAI (base de conocimiento por empresa) **sí** se consultaba en Closer Elite (`analyze_objection` lo llama siempre que hay `assistant_id`), pero **no** en el Entrenador (`/entrenar`).

### Causa raíz
En `prompt_service.py:get_system_prompt()`, la consulta al Assistant (`get_assistant_knowledge`) estaba dentro del branch `especifico/desconocido` de `clasificar_intencion()`. Cuando el input se clasificaba como `general` (palabras como "ventas", "vender", "cierre", "cerrar", "objeción", "objeciones", "prospecto", "quiero", "cómo", "ayuda", etc.), la función retornaba temprano **sin** consultar el Assistant.

### Fix aplicado
- Movida la consulta `get_assistant_knowledge(user_input, assistant_id=assistant_id)` al inicio de `get_system_prompt`, ANTES del branching por intención.
- El contexto recuperado se inyecta ahora en ambos branches (`general` y `especifico/desconocido`).
- En el branch `general` se agregó regla: "Si el usuario pregunta por productos, servicios o directrices de la empresa, usa el contexto relevante de arriba".

### Archivo modificado
| Archivo | Cambio |
|---------|--------|
| `backend/services/prompt_service.py` | `get_system_prompt()` consulta el Assistant siempre que exista `assistant_id`, sin importar la intención clasificada |

### Código muerto eliminado
- `backend/core/config.py`: eliminado `openai_assistant_id = os.getenv("OPENAI_ASSISTANT_ID")` (nunca se usaba; cada empresa usa `companies.openai_assistant_id`).
- `backend/services/openai_service.py`: eliminado import no usado de `openai_assistant_id`.

### Tests agregados
`backend/tests/test_company_assistant.py` — 7 tests (pytest, con mocks de `supabase` y `get_assistant_knowledge`):
- `get_company_assistant_id()` resuelve el Assistant correcto por empresa (`user-falabella` → `asst_falabella`, `user-invu` → `asst_invu`).
- Devuelve `None` cuando el usuario no tiene empresa, la empresa no tiene `openai_assistant_id`, o el usuario no existe.
- El Entrenador consulta el Assistant de la empresa en ambos branches (`general` y `especifico`) — el id que llega a `get_assistant_knowledge` es el de la empresa, no un global.
- Sin `assistant_id`, `get_assistant_knowledge` NO se llama.

Correr: `cd backend && .venv/bin/python -m pytest tests/test_company_assistant.py -v`

Otros tests unitarios agregados (mocks, sin red):
- `backend/tests/test_openai_service.py` — `get_assistant_knowledge` (run completado/no completado, error creando thread, cleanup del thread en `finally`) y `analyze_objection` (inyección de contexto, no consulta sin assistant, contenido vacío → ValueError).
- `backend/tests/test_prompt_service.py` — `clasificar_intencion` (general/específico/desconocido), `get_system_prompt` (perfil con nivel/bloqueos, sin bloque de contexto cuando no hay assistant) y `generar_plan_entrenamiento` (JSON válido / contenido vacío → ValueError).

### Refactor: funciones puras extraídas a `services/text_processing.py`
El filtro de alucinaciones de Whisper y las correcciones TTS estaban inline en `training_routes.py`. Se extrajeron a funciones puras para poder testearlas:
| Función | Descripción |
|---------|-------------|
| `is_hallucination(text)` | Detecta alucinaciones de Whisper (audio vacío/corto, `amara.org`, `subtítulos`, `gracias por ver`). Devuelve `bool`. |
| `apply_tts_fixes(text)` | Reemplaza términos en inglés antes del TTS (`CEO`, `ROI`, `leads`, `feedback`, `follow up`, `OK`), case-insensitive. |

`training_routes.py` ahora importa y usa ambas funciones (eliminado `import re` que quedó sin uso).

### Tests de endpoints, auth y texto
- `backend/tests/test_text_processing.py` — `is_hallucination` (7 casos) y `apply_tts_fixes` (6 casos).
- `backend/tests/test_config.py` — `get_user_id` (token válido/inválido/sin header) y `get_user_role` (admin/sin perfil/error).
- `backend/tests/test_endpoints.py` — Flask test client: `/health`, `/`, `/entrenar` (401 sin auth, 400 sin texto), `/analizar` (400 sin objeción, 200 válido con `analyze_objection` mockeado), `/conocimiento/admin` (401/403/400).

Correr todos: `cd backend && .venv/bin/python -m pytest tests/ -v` (73 tests)

**Nota:** `tests/test_trainer_logic.py` era un script manual; se le agregó `__test__ = False` para que pytest no intente recolectar su función `test_trainer(text, ...)` como test (fallaba con "fixture 'text' not found").

**Nota (latencia):** ahora cada mensaje de `/entrenar` con `assistant_id` configurado hace un round-trip extra al Assistant (thread + run + poll). Si se quiere optimizar, reintroducir un fast-path solo para mensajes triviales (saludos/cortos), pero manteniendo la consulta para el resto.

---

## Correcciones aplicadas (2026-08-13) — Scoring SQL: bug NULL en primera actividad del día

### Tests de fórmulas de scoring (via Supabase MCP, transacciones con ROLLBACK)
Se validaron las fórmulas de `daily_metrics` contra la BD real (proyecto `nqaiuixiryqlcszikwgb`), todas en `BEGIN…ROLLBACK` (sin datos residuales):

| Regla | Resultado |
|-------|-----------|
| Bloque de conversación de 300s → 5 min | ✅ |
| Bloque de 1 solo mensaje → 60s mínimo → 1 min | ✅ |
| Bloque de 10800s (13 msgs, gaps 900s) → cap 3600s → 60 min | ✅ |
| Gap >1800s divide en 2 bloques (600s + 600s → 20 min) | ✅ |
| Closer: 3 consultas → `closer_count=3`, `total_minutes=1` | ✅ (tras el fix) |
| Quiz: 2 respuestas → `quiz_answers=2`, `total_minutes=12` (con training=10, closer=2) | ✅ |

### Bug encontrado y corregido
`sync_daily_metrics_on_closer()` e `increment_daily_quiz_answer()` leían `training_minutes`/`closer_count`/`quiz_answers` con `SELECT … INTO` desde `daily_metrics`. Si **no existía** fila para ese `(user_id, day)` (primera consulta al Closer o primer quiz/contenido del día), las variables quedaban `NULL` (`COALESCE` dentro del SELECT no aplica cuando no hay fila), y el `INSERT` fallaba con:

```
null value in column "training_minutes" violates not-null constraint
```

Esto rompía el registro de la **primera actividad del día** para Closer y quiz.

**Fix:** agregar `COALESCE(var, 0)` después del `SELECT … INTO` en ambas funciones.

| Archivo | Cambio |
|---------|--------|
| `backend/db/migrations/20260813_fix_daily_metrics_null_on_first_activity.sql` | `CREATE OR REPLACE FUNCTION sync_daily_metrics_on_closer()` y `increment_daily_quiz_answer()` con guards `COALESCE(..., 0)` |

Aplicado a producción via Supabase MCP.

### Advertencia de seguridad (pendiente, preexistente)
El linter de Supabase marca varias funciones `SECURITY DEFINER` expuestas vía RPC a `anon`/`authenticated`: `recalculate_daily_metrics`, `increment_daily_quiz_answer`, `is_admin`, `is_super_admin`, `is_company_admin`, `get_user_company_id`, `handle_new_user`, y los triggers `sync_daily_metrics_on_*`. Evaluar `REVOKE EXECUTE` / `SECURITY INVOKER` donde corresponda.

---

## Correcciones aplicadas (2026-08-19) — Entrenador: timer y grabación en Chrome/Windows

### Contexto
En algunos PCs con Windows + Chrome (independiente de la versión) el contador del Entrenador se quedaba en `00:00:00` y no se registraban `training_minutes`. Solo afectaba a parte de los usuarios.

### Causas
1. **Hold-to-talk con `mousedown`/`mouseleave`:** el botón del mic usaba `hover:scale-105 active:scale-95`. En Chrome/Windows (sobre todo con DPI 125%/150%) el transform saca el cursor del hit-box y dispara `mouseleave` al instante. La grabación se cortaba vacía, `/entrenar` no corría, no había `messages`, y el trigger de `daily_metrics` (que recalcula desde mensajes, no desde `duration_sec`) dejaba el tiempo en 0.
2. **`MediaRecorder.start()` sin timeslice:** en algunos drivers de audio de Windows `ondataavailable` llega vacío al hacer `stop()`.
3. **Race `getUserMedia`:** `mouseup` ocurría antes de que existiera el recorder (permiso del mic), `handleStop` no hacía nada, y si el arranque fallaba el reloj nunca arrancaba.
4. **IDs rotos:** el JS buscaba `#start-training` / `#end-training`, el HTML tiene `#training-timer-start-btn` / `#trainer-exit-btn`. El botón X no guardaba la sesión. Cerrar la pestaña tampoco.
5. **`recordInteractionStart` no-op** si `trainingInterval` era null: el reloj no se movía aunque el usuario hablara.

### Fix
| Archivo | Cambio |
|---------|--------|
| `frontend/src/lib/trainerHold.ts` | Máquina de estados del hold (pointer capture, pending-stop, mime, blob vacío) |
| `frontend/src/views/Trainer.ts` | Pointer Events + `setPointerCapture` (ya no `mouseleave`). Timeslice 250ms. Ciclo de reloj termina también en error. Botones reales del HTML. |
| `frontend/src/app.ts` | Micrófono arranca el timer si no estaba activo. `finishTrainingSession`. `pagehide` guarda la sesión. |
| `frontend/index.html` | Sin scale en el mic (evita mouseleave). `touch-action: none`. Glow del orb `pointer-events-none`. |
| `frontend/__tests__/trainerHold.test.js` | Tests del hold, mime y blobs vacíos |

El tiempo sigue siendo por ciclo micrófono→respuesta (AGENTS.md). El reloj arranca **solo cuando el micrófono ya está permitido y la grabación empezó**, no durante el popup de permiso del navegador. El primer click pide el permiso; hay que aceptar y volver a mantener presionado para hablar.

Correr: `cd frontend && npm test` (incluye `trainerHold.test.js`)

---

## Correcciones aplicadas (2026-08-21) — Auth session missing al restablecer contraseña

### Contexto
Algunos usuarios veían `Auth session missing` al enviar la nueva contraseña en `/reset-password`. El formulario se mostraba igual, pero `updateUser()` corría sin sesión de recovery.

### Causas
1. **PKCE (default de supabase-js 2.x):** el email trae `?code=` (no `#type=recovery`). El `code_verifier` vive en `localStorage` del navegador donde se pidió el reset. Abrir el correo en otro dispositivo/navegador (o un in-app browser) deja el code sin verifier → no hay sesión.
2. **`SIGNED_OUT` recargaba la página:** si había una sesión previa, el canje del code dispara `SIGNED_OUT` y el listener hacía `location.reload()`. El code es de un solo uso; tras el reload la sesión de recovery no quedó y `updateUser` fallaba.
3. **Detección solo por hash:** el router mandaba a `/login` si no veía `type=recovery` en el hash. Los enlaces PKCE (`?code=`) caían en ese caso.
4. **Formulario usable sin sesión:** `/reset-password` mostraba el formulario aunque el enlace no se hubiera canjeado.

### Fix
| Archivo | Cambio |
|---------|--------|
| `frontend/src/lib/passwordRecovery.ts` | Parseo de hash implicit, PKCE `?code=`, `token_hash`, OTP expirado, y mensajes en español |
| `frontend/src/api/supa-client.ts` | No recargar en `SIGNED_OUT` durante recovery. `establishRecoverySession()` (`verifyOtp` / `getSession` / `exchangeCodeForSession`) antes de `updateUser` |
| `frontend/src/app.ts` | No habilitar el submit hasta tener sesión. Error claro + “solicitar un nuevo enlace”. Ya no redirige a `/login` por falta de hash |
| `frontend/index.html` | Botón para pedir un enlace nuevo desde el paso de nueva contraseña |
| `frontend/__tests__/passwordRecovery.test.js` | Tests de URL y mensajes |

### Nota (enlaces cross-device)
PKCE exige el mismo navegador. Para que el correo funcione en otro dispositivo, el template de Auth en Supabase Dashboard debe usar `token_hash`:

```
{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery
```

El frontend ya llama `verifyOtp({ token_hash, type: 'recovery' })` cuando ese query está presente.

Correr: `cd frontend && npm test` (incluye `passwordRecovery.test.js`)

---

## Correcciones aplicadas (2026-08-14) — Audio del Entrenador en móvil (Safari/Chrome)

### Contexto
El audio de respuesta del Entrenador (`/entrenar`) se reproducía en desktop pero no en móvil (iOS Safari ni Android Chrome).

### Causa raíz
1. **Autoplay policy móvil:** `audio.play()` se ejecutaba después de un `fetch` async (no en gesto del usuario), por lo que iOS Safari y Android Chrome lo bloqueaban.
2. **Ruta por `MediaElementSource`:** el audio se conectaba a un `AudioContext` suspendido vía `createMediaElementSource`; sin contexto desbloqueado no hay sonido.
3. **`audio/webm` no soportado en iOS Safari:** `MediaRecorder` con `mimeType: 'audio/webm'` no funciona en iOS (solo `audio/mp4`).

### Fix aplicado (frontend/src/views/Trainer.ts)
- `unlockAudio()`: crea/reanuda el `AudioContext` y reproduce un buffer silencioso. Se invoca en el gesto del usuario (mousedown/touchstart del micrófono, botón "Empezar", y listeners `document` one-time).
- `playResponseAudio(url, onEnd)`: reproduce la respuesta vía Web Audio (`fetch` → `arrayBuffer` → `decodeAudioData` → `AudioBufferSourceNode`), que funciona una vez el contexto está desbloqueado. Fallback a `HTMLAudioElement` con `playsInline` si `decodeAudioData` falla.
- Visualizer refactorizado: `disconnectSource()` + `startVolumeLoop()` extraídos (antes `updateVolume` estaba anidado en `startAudioVisualizer`).
- `pickAudioMimeType()`: selecciona el codec soportado (`audio/webm;codecs=opus`, `audio/webm`, `audio/mp4`, `audio/m4a`, `audio/aac`) vía `MediaRecorder.isTypeSupported()`, y se usa el mime real para el `Blob` y el nombre de archivo.

### Notas
- El backend guarda el audio en `temp_*.wav` pero `transcribe_audio()` lo envía a Whisper en binario (Whisper detecta formato por contenido, no por extensión), así que `.m4a`/`.mp4` de iOS también transcriben correctamente.
- `frontend/src/lib/simple_trainer.ts` es código muerto (no se importa en ningún lado); no se modificó.
- Verificado con `npm run typecheck` y `npm run lint`.

---

## Graphify — Knowledge Graph del Proyecto

Graphify genera y mantiene un knowledge graph del codebase completo para consultas de arquitectura, dependencias y relaciones entre archivos.

### Archivos y ubicación
| Archivo | Descripción |
|---------|-------------|
| `graphify-out/graph.json` | Grafo principal: nodos, edges, comunidades (823 nodos, 1422 edges, 84 comunidades) |
| `graphify-out/graph.html` | Visualización interactiva D3/vis-network |
| `graphify-out/GRAPH_REPORT.md` | Resumen legible con god nodes, comunidades, y preguntas sugeridas |
| `graphify-out/manifest.json` | Inventario de 229 archivos con hashes AST y semánticos |
| `.opencode/plugins/graphify.js` | Plugin v0.9.36 que inyecta recordatorios en comandos bash |

### Uso
- **Consultar el grafo:** usar el skill `graphify` para queries enfocadas en lugar de grep sobre archivos crudos
- **Leer GRAPH_REPORT.md:** solo para contexto amplio de arquitectura
- **Regenerar:** ejecutar `graphify` desde CLI (tool instalado via `uv`)
- **Plugin activo:** cada `bash` recibe un recordatorio si `graphify-out/graph.json` existe

### Regeneración
```bash
cd /Users/whiz/Workspace/gravitysymbiosisv1
graphify  # regenera todo graphify-out/
```

### Notas
- `graphify-out/` NO está en `.gitignore` — considerar si debe incluirse
- Generado por última vez: 2026-08-10
- ~74,500 tokens consumidos en la generación (68,700 input + 5,800 output)

## Tema claro por defecto en toda la app (2026-10-13)
- rontend/src/app.ts (initOpenAITheme): si localStorage.gravity_openai_theme no existe, la app arranca en tema claro (	heme-openai) en todas las vistas, no solo en /lab.
- rontend/src/openai-theme.css: bloque nuevo html.theme-openai #view-test-login — adapta el login del modo lab (/lab) al tema claro (la vista estaba maquetada solo en oscuro: g-black, 	ext-white, 	ext-gray-*). Fondo #fafafa, tarjeta blanca borde #fde68a, textos #6e6e6e, ámbar legible #92400e, botón secundario blanco.
- El tema oscuro no cambia (reglas prefijadas con html.theme-openai).
- El tema se guarda en localStorage por navegador: previews internos (ej. Cursor) tienen storage propio; forzar con ?theme=openai | ?theme=dark.
- Verificado: screenshots de /lab en claro y oscuro; 
px tsc --noEmit y 
px eslint src/app.ts limpios.

## Closer — Documentación de arquitectura (2026-10-13)
- Nueva referencia completa del módulo Closer Elite en `docs/CLOSER_ARQUITECTURA.md`: flujo end-to-end (Enter → respuesta), interacción frontend (`Closer.ts`: placeholders rotativos, botón enviar/detener, morph del indicador, staggerReveal), backend (`POST /analizar`: JWT, rate limit 10/min-100/hora, Assistant por empresa), motor IA (`analyze_objection`: análisis 4D, playbook táctico, frase killer, preguntas calibradas, JSON estricto), scoring (`saveCloserUsage` → +30s), diseño CSS (estilo Gemini, `.closer-*` en main.css + tema claro en openai-theme.css, animaciones, responsive, reduced motion) y modo lab (mock sin red).
- Solo documentación; sin cambios de código backend ni frontend en esta entrada.

## Rutas locales para ver el rediseño — Modo Lab (2026-10-14)
- Movido a `REDESING.md` (raíz del repo): tabla completa de URLs `http://localhost:5173/lab/<vista>` sin login, forzar tema con `?theme=openai|dark`, y URL de red local para móvil.
- Links clickeables por cambio/campo a verificar → `VISUALIZAR-CAMBIOS.md`.

## Dashboard — Paleta violeta-tinted + sync de tema global (2026-10-14)
Correcciones de paleta en tema claro (el usuario reportó gris sucio que no combinaba) + fixes estructurales:

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `frontend/index.html` (tailwind.config) | `background/primary/secondary/accent` dejaron de ser colores estáticos (green-primary legacy) y ahora son `hsl(var(--…​) / <alpha-value>)` — las clases `bg-secondary/20`, `text-primary`, `bg-primary/5` etc. ahora SIGUEN los tokens HSL del tema activo (`:root` oscuro / `#view-dashboard.light` / variables del tema). Esta era la causa raíz del gris: `secondary: 'hsl(0,0%,10%)'` estático con alpha 20% sobre blanco = gris sucio. |
| 2 | `frontend/src/dashboard.css` (bloque `.light` ~1929) | Paleta violeta-tinted: `--background: 258 60% 97.5%`, `--border: 258 30% 91.5%`, `--secondary: 258 45% 95.5%`, `--muted: 258 40% 96%`, `--input: 258 45% 96%` (antes 220 gris neutro). Foregrounds violeta-oscuro (`258 30% 13%` / `258 22% 17%` / muted-foreground `258 12% 42%`). |
| 3 | `frontend/src/dashboard.css` | Override `[class*="border-white/5"]` → `hsl(var(--border))` en `.light` (los bordes blancos translúcidos del diseño dark eran invisibles en claro). |
| 4 | `frontend/src/openai-theme.css` (~638) | Topbar/content del dashboard claro empalma con `hsl(258 60% 97.5%)` (antes `hsl(220 22% 96.5%)`) — fondo continuo sin corte. |
| 5 | `frontend/src/app.ts` (`setOpenAITheme`) | El dashboard interno ahora SIEMPRE sigue al tema global: `setOpenAITheme` escribe `dashboard-theme` (light/dark) y dispara `CustomEvent('gravity-theme-change', {detail:{on}})`. Antes tenía su propio default `'dark'` → en tema claro mostraba superficies translúcidas oscuras sobre blanco, y en oscuro quedaba claro (mix roto). |
| 6 | `frontend/src/app.ts` (DOMContentLoaded) | Listener `gravity-theme-change` → `updateDashboardThemeUI()`. |
| 7 | `frontend/index.html` + `app.ts` + `openai-theme.css` + `dashboard.css` | **Botón "MODO OSCURO/CLARO" del dashboard ELIMINADO** (user y admin): redundante porque el dashboard sigue al tema global (`?theme=...`, toggle del lab con `setOpenAITheme`). Retirados `.theme-dashboard-toggle` del HTML, handler en JS (IconSun/IconMoon import quitado), y reglas CSS muertas en ambos temas. |

Verificado en navegador (`/lab/dashboard`): tema claro = fondo violeta suave, cards blancas, pills "Tester Lab"/tabs mode-blancos con borde, inputs INICIO/FIN violeta suave con date-chips blancos, SEMANA activo violeta; tema oscuro = dashboard oscuro coherente con sidebar. `tsc --noEmit` y `eslint src/` limpios.

## Topbar — Fade tipo Gemini al hacer scroll (2026-10-14)
- `dashboard.css`: `.topbar` (sticky, z-40) ya no usa `hsla + backdrop-blur + border-bottom`. El fondo es un degradado en `::before` (`z-index:-1`, `isolation:isolate`, `--topbar-fade`: sólido arriba 55% → transparente 100%): el contenido se disuelve gradualmente al pasar por debajo y el contenido del header queda SIEMPRE sólido encima (antes el degradado directo desvanecía lo que hay dentro del topbar). `backdrop-filter: none` — el blur dibujaba un rectángulo duro detrás del degrade. Var `--topbar-fade` usa `--background` (negro en dark).
- `openai-theme.css`: **AHORA ES GLOBAL EN TEMA CLARO** — `html.theme-openai .topbar` define `--topbar-fade` blanco (`#ffffff 55% → rgba(255,255,255,0) 100%`) y `background: transparent`; antes era `#ffffff sólido + blur` → en el Closer el texto se cortaba de golpe al pasar bajo la barra sin dissolve. El usuario reportó "no se ve el fade deslizando al usar el Closer". En dashboard, el override con `body:has(...)` sigue con violeta `hsl(258 60% 97.5%)`.
- `openai-theme.css` (dashboard, claro): `--topbar-fade` con `hsl(258 60% 97.5%)` (violeta-tinted) para topbar de `#view-dashboard`/`#view-dashboard-admin` via `body:has(...)`.
- Empalme sin scroll: el `body` bajo el topbar toma el mismo violeta (`html.theme-openai body:has(#view-dashboard:not(.hidden)) { background: hsl(258 60% 97.5%) }`) — antes el `#fafafa` del body asomaba por el hueco del fade.
- `#bg-canvas` (partículas z-0 fijo) oculto en las vistas de dashboard: ensuciaba el tono del bg bajo el fade (mezcla 231,227,240 vs 247,245,252 del degradado).
- Notas: en desktop `#sidebar-toggle` está `display:none` (el botón visible es el del sidebar), por lo que el topbar queda como barra de fondo pura — el fade es su único contenido visual.
- Verificado en navegador (claro y oscuro, scroll): los elementos (pills/días/números) se difuminan progresivamente sin borde duro. Solo CSS; sin JS.

## Latencia del motor IA en ms — Closer y Entrenador (2026-10-14)
Se mide el tiempo de respuesta (envío → respuesta recibida) y se muestra bajo la respuesta (importante para tuning/demos):
- **Closer** (`frontend/src/views/Closer.ts`): `performance.now()` antes del request (o del delay mock en lab) → en `finish(html, t0)` se agrega `<div class="closer-latency">⏱ respondido en X ms</div>` dentro de la burbuja del asistente (después de la respuesta). En lab muestra el delay simulado (~1100 ms). El tag sale junto al staggerReveal al morphizar el indicador.
- **Entrenador** (`frontend/src/views/Trainer.ts`): `addChatMessage(role, text, id, latencyMs?)` aceptó nuevo parámetro opcional — los mensajes del asistente muestran `<div class="trainer-latency">⏱ X ms</div>` (10px, mono, gris). Medición: lab = delay simulado (~900 ms); real = `performance.now()` alrededor del `fetch('/entrenar')` (transcripción + generación + guardado). Solo se etiqueta cuando hay `response_text`.
- Los tags usan clases Tailwind inline (grises legibles en ambos temas) — no CSS nuevo necesario.
- **Tag dentro de la burbuja**: `renderResponse(html, tail)` — el tag de latencia va DENTRO de `.closer-assistant-bubble` (antes quedaba a la derecha, flotando fuera, porque `.closer-msg` es flex row).
- **Columna más ancha estilo Gemini (desktop)**: el Área de texto+barra del Closer pasó de `42rem`(672px) a `50rem`(800px): `#closer-chat` y `.closer-composer` en `index.html` (`max-w-[50rem]`), y `max-width: 50rem` en `main.css` (modo expandido + vertical móvil). Mantiene alineación con el composer.
- Verificado: peticiones IAB en lab del Closer (DOM: "⏱ respondido en 1103 ms") y columna ancha en 1440×900 (texto y pill ~800px). En Entrenador laboratorio el mic no está disponible en headless — validado por typecheck/lint y código (ruta idéntica closers).

## Entrenador horizontal — se cortaba el diseño (2026-10-14)
- **Síntoma**: en desktop/paisaje el contenido arrancaba muy abajo (`pt-32` = 128px) y los controles quedaban cortados por el borde inferior (el `min-h-[calc(100vh-64px)]` de la sección permitía crecer más que el viewport → overflow). En vertical estaba bien (media query de `dashboard.css:870` lo compacta).
- **Fix** en `dashboard.css` (bloque nuevo `@media (min-width:769px)` tras la regla de pantalla completa): `#view-trainer` con altura fija `calc(100vh - var(--topbar-height))`, `overflow:hidden`, padding-top 2.5rem (1.25rem si `max-height:800px`), gap 0.5rem, y reescalado de la orbe (`#trainer-orb-canvas` 290px / 240px en ventanas bajas, glows `#orb-verse` 380/500 y 320/420, `#trainer-status` margin-top reducido).
- NOTA anidada previamente: los media queries CSS anidados (`@media` dentro de `@media`) funcionan en los navegadores actuales.
- Verificado en navegador: 1440×800 (todo visible, botones enteros con aire) y 390×844 vertical (sin cambios, correcto).
- **Barra de scroll horizontal en el Entrenador (2026-10-14)**: el drawer de chat (`#chat-drawer`, `right-0` + `translate-x-full`) vive FUERA de los límites del `#view-trainer` (que tenía `overflow:auto`) → generaba una barra de scroll horizontal gris en móvil. Fix: `overflow-x: hidden !important` en la regla de pantalla completa (`.content-area:has(#view-trainer...) #view-trainer`). El drawer sigue entrando/deslizando normal (right-0 dentro de límites). En ventanas muy bajas (`max-height:800px`) el bloque compacto usa `overflow-y: auto` (scroll de seguridad) para que los controles siempre sean alcanzables. Verificado: sin barra horizontal + chatdrawer abre en 390×844 (`#trainer-chat-btn` → TRANSCRIPCIÓN EN VIVO).

## Sidebar colapsado — rail alineado + tooltips estilo Gemini (2026-10-14)
- **Botones chuecos**: la barra interna `.sidebar-nav` (`overflow-y:auto`) reservaba espacio de scrollbar de Windows → todo el rail se corría a la izquierda. Fix: `scrollbar-width:none` + `::-webkit-scrollbar { display:none }` en `.sidebar.collapsed .sidebar-nav`; `.nav-item` con `flex: 0 0 auto`. Medido: items 44px centrados en rail 72px (13.5/-13.5).
- **Hover circular (no cuadrado)**: en tema claro, `openai-theme.css: ~285` define `border-radius: 8px !important` en todos los `.nav-item` — anulaba el píldora del rail colapsado. Fix: `.sidebar.collapsed .nav-item, .nav-item.active { border-radius: 9999px !important }` en `dashboard.css` (gana por especificidad y orden de carga).
- **Tarjetita tooltip estilo Gemini al hover**: 17 items del nav + `#sidebar-toggle-collapsed` tienen `data-tooltip="<Label>"` ( añadido programáticamente en `index.html`). CSS en `dashboard.css` (bloque colapsado): `::after` con `content: attr(data-tooltip)`, tarjeta negra `#0d0d0d`/texto blanco, radius 14px, `left: calc(100%+12px)`, fade+slide 150ms. En tema oscuro la tarjeta es blanca `#f4f4f7`. CRÍTICO: el tooltip se recortaba por `overflow:hidden` de `.sidebar` y `overflow-y:auto` de `.sidebar-nav` → liberados con `overflow: visible` dentro de `@media (min-width:769px)` SOLO cuando `.collapsed` (el estado expandido y móvil conservan sus scrollbars).
- Verificado en navegador: hover en "Entrenador" muestra círculo solicitado + tarjeta negra "Entrenador" sin recorte; items del rail centrados.

## Sidebar móvil — franja visible (2026-10-14)
- **Causa**: `dashboard.css:122` `.sidebar.collapsed { transform: translateX(0) !important }` anulaba el off-canvas móvil (`translateX(-100%)`) cuando el estado colapsado quedó guardado en `localStorage` (`gravity_sidebar_collapsed=1`, restaurado en `app.ts:961` solo en desktop) → franja de 72px que no se ocultaba al 100%.
- **Fix CSS** (bloque `@media (max-width:768px)` de `dashboard.css`): `.sidebar.collapsed { transform: translateX(-100%) !important }`, `.sidebar.collapsed.open { transform: translateX(0) !important; width: var(--sidebar-width) !important }`, `.sidebar.collapsed ~ .main-wrapper { margin-left: 0 !important }` (defensivo ante edge-cases).
- **Fix JS** (`app.ts` sidebar wiring): listener `resize` que limpia `.collapsed`+`.is-collapsed` y `open` al pasar a ≤768px, y reaplica `.collapsed` según storage al pasar a >768px (rotación/responsive entre desktop y móvil).


## Entrenador — Drawer TRANSCRIPCIÓN EN VIVO con efecto glass (2026-10-16)
- Reporte: el drawer del chat (`#chat-drawer`) se veía plano (claro: caja blanca casi opaca 0.97; oscuro: `bg-gray-950/95`).
- **Causa raíz del "no hay vidrio" en claro**: `html.theme-openai #view-trainer > div.absolute { background:#ffffff !important }` (regla pensada para el div ambiental del fondo) TAMBIÉN matcheaba al drawer (otro `div.absolute` hijo de `#view-trainer`) y lo pintaba blanco sólido encima de cualquier override del drawer — por eso 2 iteraciones de tinte "no se veían". Fix: el div ambiental ahora tiene `id="trainer-ambient-bg"` en `index.html` y la regla quedó scoped a `> #trainer-ambient-bg` (abril 2026-10-16). Lección: en `#view-trainer` NO usar selectores `> div.<clase>` genéricos — el drawer también es un `div.absolute` hijo.
- Cambios:
  - `frontend/index.html`: base dark del drawer `bg-gray-950/45` + `border-violet-500/10` + `backdrop-blur-2xl backdrop-saturate-150` + sombra `-12px 0 40px` (glass en tema oscuro también; 1er intento /70, el usuario pidió "más transparente").
  - `frontend/src/openai-theme.css` (bloque trainer ~496): claro = vidrio con tinte violeta `linear-gradient(180deg, rgba(242,236,253,0.66) → rgba(230,220,250,0.48))` + `backdrop-filter: blur(28px) saturate(1.5)` + borde izquierdo violeta + highlight interior `inset 1px 0 0 rgba(255,255,255,0.75)`; header con `border-bottom` violeta translúcido; `#trainer-chat-container` transparente (antes blanco sólido, tapaba el glass); botón cerrar legible en claro; burbuja del usuario (`#trainer-chat-container .text-right > .msg-content`) ahora vidrio violeta tenue con blur(10px) y texto `#2e1065` (antes pill plano `bg-violet-900/20` + `text-white` invisible-ish en blanco). Nota: sobre fondo blanco puro un vidrio neutro es invisible — el tinte violeta sutil es el que lo hace legible como panel.
- Nota: no hay clase `.msg-user` en el markup de `addChatMessage` (Trainer.ts) — el wrapper user es `.text-right`, apuntar con ese selector.
- **Drawer a pantalla completa (2026-10-16, reporte "vacío blanco arriba")**: el drawer era `absolute` dentro de `#view-trainer` (que tiene `overflow: hidden auto`) → arrancaba debajo del topbar y cualquier intento de subirlo con `top` negativo era RECORTADO por el overflow del trainer (la parte superior ni se pintaba ni recibía hits; el título "TRANSCRIPCIÓN EN VIVO" desaparecía). Fix: drawer `position: fixed; top: 0; height: 100dvh` (escapa del clip del trainer; los ancestros no tienen transform → containing block = viewport). Además `dashboard.css` (~2215): `.content-area:has(#view-trainer:not(.hidden)):has(#chat-drawer:not(.translate-x-full)) { z-index: 70 !important }` — el stacking context de `.content-area` (z-10) limitaba el z del drawer por debajo del topbar (sticky z-40); con el drawer abierto el content-area sube a 70 y el glass cubre el topbar. Al cerrar vuelve a z-10 (el topbar fade recupera su rol). Cerrado con `translate-x-full` fixed NO genera scroll horizontal (verificado: scrollW == innerW).
- Verificado en navegador (`/lab/entrenador`, drawer abierto): glass visible (timer/mic se traslucen) en claro y oscuro; texto legible; llaves CSS balanceadas.

## Entrenador — oculto el mock de fase/certeza/progreso (2026-10-16)
- Reporte: el bloque INICIANDO PROTOCOLO + CERTEZA: --% + 0% + barra de progreso no tenia funcionalidad.
- Verificado en codigo: 	raining-phase-name, performance-score, 	raining-progress-val y 	raining-progress-bar NO tienen ninguna referencia JS (Trainer.ts/app.ts: 0 matches) - mock visual muerto.
- Cambio en rontend/index.html (view-trainer): hidden en los 2 divs (header de fase + barra de progreso), con ids nuevos 	rainer-phase-header / 	rainer-progress-bar-wrap para reactivarlos si se conecta IA real. Los ids internos (training-phase-name, etc.) se conservan intactos.
- El pill del timer (OPERATIONAL MODE + reloj) SI es funcional (app.ts startTrainingTimer/stopTrainingTimer, reloj de sesion) - se deja visible.
- Verificado en navegador (/lab/entrenador 430px y desktop): header muerto fuera, layout compacto correcto.

## Entrenador — pill del timer oculto (2026-10-16)
- Reporte: tras ocultar el mock de fase/certeza, el usuario pidio ocultar tambien el pill OPERATIONAL MODE 00:00:00.
- Cambio: dashboard.css (bloque entrenador ~2230): #training-timer-overlay { display: none !important } - regla permanente, ambos temas.
- IMPORTANTE: el timer SIGUE funcionando. startTrainingTimer/stopTrainingTimer (app.ts) no se tocaron: el interval corre, el reloj (#training-active-clock) se actualiza aunque este invisible, y la sesion se sigue registrando en Supabase (tiempo por interaccion mic -> respuesta). display:none gana sobre los toggles de opacity/scale que hace el JS, por eso no hizo falta cambiar app.ts.
- Nota: si en el futuro se quiere un reloj visible de nuevo, quitar la regla CSS (el overlay y el COMENZAR siguen en el DOM).
- Verificado en navegador (/lab/entrenador claro): orbe + status + 3 controles; pill fuera; reloj interno sigue en marcha (textContent vivo).

## Entrenador — kicker de identidad (2026-10-16)
- Agregado el kicker GRAVITY SYMBIOSIS del Closer encima del status (#trainer-status) en rontend/index.html: div#trainer-kicker inline-flex + punto violeta nimate-pulse + font-mono 10px/11px uppercase 	racking-[0.35em] text-violet-400. Mismo estilo que el header del Closer (line ~1611).
- Ritmo vertical: el mt-8 viejo del status se movio al kicker (mt-8 mb-1), status pasa a mt-1 - el kicker queda pegado a la burbuja de status, la separacion orb-texto no cambia.
- Verificado en claro y oscuro (430px): kicker centrado sobre Escuchando.../Listo para entrenar.

## Entrenador — kicker movido encima de la esfera (2026-10-16, corrección)
- El usuario pidió GRAVITY SYMBIOSIS ARRIBA de la orbe (no entre orbe y status). `#trainer-kicker` ahora es el primer hijo del wrapper de la orbe (`div.relative.z-10 flex flex-col...`, antes de `#orb-container`), con `mb-1` (sin mt-8). Status conserva `mt-1`.

## Entrenador — frases rotativas del status + estilo fino (2026-10-16)
- `frontend/src/views/Trainer.ts`: los estados del status se unificaron en `applyStatusForState()` (reemplaza los 2 switch duplicados en `ensureOrb` y `loadConversation`). En `idle` el status ROTA cada 3500ms por `IDLE_PHRASES` (7 frases: que quieres trabajar hoy / revisamos productos / algun cliente no responde / asistente 24/7 / objeciones / pitch 60s / cierre de precios) con animacion `phrase-swap` (fade+slide 0.35s, `dashboard.css` ~2236, respeta prefers-reduced-motion). En listening/processing/speaking el interval se detiene y se muestran las frases funcionales de siempre.
- El interval se autodetiene si `#view-trainer` queda `hidden` (navegacion) y se re-arma al volver a idle.
- Estilo del status (`#trainer-status` en index.html): `text-2xl font-bold` paso a `text-xl font-light` (mas pequeno y delgado, pedido del usuario). El tema claro ya usa Plus Jakarta Sans (openai-theme.css:494).
- Verificado: rotacion en vivo (5 frases observadas en secuencia), `npm run typecheck` y `npm run lint` en 0 errores.
