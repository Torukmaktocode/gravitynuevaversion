# Links para visualizar los cambios (2026-10-14)

Levantar primero: `cd frontend && npm run dev` → Vite en `http://localhost:5173` (y backend Flask en `:5001` si se prueba con IA real).

Base modo lab (sin login): `http://localhost:5173/lab`

Temas: `?theme=openai` = claro · `?theme=dark` = oscuro (por defecto arranca en claro).

## Links Modo Lab (todos, sin login)

| # | Vista | Link |
|---|---|---|
| 1 | Login lab | http://localhost:5173/lab |
| 2 | Dashboard | http://localhost:5173/lab/dashboard |
| 3 | Entrenador | http://localhost:5173/lab/entrenador |
| 4 | Closer Elite | http://localhost:5173/lab/closer-elite |
| 5 | Alfred AI | http://localhost:5173/lab/alfred-ai |
| 6 | Shadow (Copilot) | http://localhost:5173/lab/shadow |
| 7 | Base de conocimiento | http://localhost:5173/lab/base-conocimiento |
| 8 | Bienestar | http://localhost:5173/lab/bienestar |
| 9 | Perfil | http://localhost:5173/lab/perfil |
| 10 | Clients | http://localhost:5173/lab/clients |
| 11 | Products | http://localhost:5173/lab/products |

Variantes de tema: agregar `?theme=openai` (claro) o `?theme=dark` (oscuro) a cualquier link de arriba.
Ejemplo completo: `http://localhost:5173/lab/closer-elite?theme=dark`

## Closer Elite — rediseño visual + animaciones
| Qué ver | URL |
|---|---|
| Look plano Gemini (bordes violeta, sin cajas) | http://localhost:5173/lab/closer-elite?theme=openai |
| Glow inferior y flujo completo en oscuro | http://localhost:5173/lab/closer-elite?theme=dark |
| Vertical/portrait: degradado continuo, dvh sin scroll | http://192.168.1.86:5173/lab/closer-elite?theme=openai (desde móvil) |
| Animaciones: morph indicador → respuesta, staggerReveal, botón detener | enviar una consulta en http://localhost:5173/lab/closer-elite |

## Dashboard — paleta violeta, sin marcos
| Qué ver | URL |
|---|---|
| Stats en violeta de marca, tarjetas limpias, hover #ddd6fe | http://localhost:5173/lab/dashboard?theme=openai |
| Fondo continuo topbar + contenido (sin corte) | http://localhost:5173/lab/dashboard?theme=openai |
| Calendario scrollea interno, headers apilados en móvil | http://192.168.1.86:5173/lab/dashboard?theme=openai (desde móvil) |

## Entrenador — glassmorphism + orbe
| Qué ver | URL |
|---|---|
| Controles de vidrio (mic violeta con glow, exit tinte rosa) | http://localhost:5173/lab/entrenador |
| Orbe con pulso suave al hablar | mantener mic presionado y hablar |
| Audio en iOS Safari / Android (Web Audio + mp4/webm) | http://192.168.1.86:5173/lab/entrenador (desde móvil) |

## Sidebar y tema claro global
| Qué ver | URL |
|---|---|
| Blanco opaco uniforme expandido/colapsado | http://localhost:5173/lab/dashboard?theme=openai (colapsar sidebar) |
| Iconos del rail colapsado centrados (caja + glifo, fix 2026-10-16) | http://localhost:5173/lab/dashboard?theme=openai (sidebar colapsado; comparar cada símbolo con el toggle superior y el borde derecho del rail) |
| Tema claro por defecto en todas las vistas | http://localhost:5173/lab (sin query, arranca claro) |

## Resto de vistas (lab, por revisar con mismo estilo)
| Vista | URL |
|---|---|
| Alfred AI | http://localhost:5173/lab/alfred-ai |
| Shadow (Copilot) | http://localhost:5173/lab/shadow |
| Base de conocimiento | http://localhost:5173/lab/base-conocimiento |
| Bienestar | http://localhost:5173/lab/bienestar |
| Perfil | http://localhost:5173/lab/perfil |
| Clients | http://localhost:5173/lab/clients |
| Products | http://localhost:5173/lab/products |

Referencias: `REDESING.md` (detalle de cambios), `frontend/src/lib/router.ts:170-182` (rutas).
