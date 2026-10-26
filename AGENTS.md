
## Sidebar colapsado � blindaje de centrado del rail (2026-10-15)
- Reporte: los iconos del rail colapsado quedaban despegados del eje central en el tema claro (depend�a de qu� regla ganara en cascada: nav expandido con `flex:1`/padding, wrappers `#sidebar-mini-bottom`/`#sidebar-collapsed-toggle-wrap`).
- Fix en `frontend/src/dashboard.css` (bloque `.sidebar.collapsed` ~158): `.sidebar.collapsed .sidebar-nav { width: 100%; box-sizing: border-box; align-self: center }` + `margin-inline: auto` en `.nav-item` (hijos directos y anidados) y en `#sidebar-collapsed-toggle-wrap`/`#sidebar-mini-bottom` (width 100% + justify-content center). El centrado ya no depende de reglas heredadas.
- Verificado en `agent-browser` (:5173/lab/dashboard): offset de cada icono respecto al eje del rail = 0px (claro) y �0.5px (oscuro); rail 72px.

## Sidebar colapsado - glifo 6px a la izquierda dentro de la caja 44px (2026-10-16)
- Reporte: con el fix del centrado de cajas del 2026-10-15, los SIMBOLOS seguian viéndose despegados a la izquierda (la caja 44px centraba bien, pero el glifo no).
- Causa real: gap: 0.75rem base del .nav-item + <span> colapsado con width: 0 -> el flex centraba svg(20)+gap(12)+span(0) = svg a -6px del centro de su caja.
- Fix en `frontend/src/dashboard.css` (regla `.sidebar.collapsed .nav-item`): `gap: 0 !important`. Al expandir vuelve el gap base (etiqueta normal).
- Verificado en browser (:5173/lab/dashboard claro): svgOffsetInBox = 0 en los 5 items; offset de caja al eje del rail = -0.5px (subpixel). Documentado tambien en gravitysymbiosisv_clon-main/AGENTS.md.
