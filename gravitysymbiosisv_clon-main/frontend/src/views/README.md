# Views — Vistas Modulares

## Propósito

Cada vista del dashboard es un módulo independiente que puede importarse bajo demanda. Esto permite:

- Dividir el monolito `dashboard.js` (~4000+ líneas) en archivos manejables
- Cargar vistas solo cuando se necesitan (lazy-loading)
- Que varios desarrolladores trabajen en paralelo
- Testear cada vista de forma aislada

## Estructura Actual

```
views/
├── README.md
├── Dashboard.js        ← Vista de usuario (weekly calendar, stats)
├── DashboardAdmin.js   ← Vista de admin (equipo completo)
├── Alfred.js           ← Diagnóstico de Alfred
├── Trainer.js          ← Entrenador por voz
├── Closer.js           ← Closer Elite
├── Knowledge.js        ← Base de conocimiento (quizzes)
├── Wellness.js         ← Bienestar (heartbeat)
├── Profile.js          ← Perfil del usuario
├── AdminUsers.js       ← Gestión de usuarios (admin)
├── AdminMetrics.js     ← Métricas globales (admin)
├── AdminAudit.js       ← Log de auditoría (admin)
├── AdminCompany.js     ← Configuración de compañía (multi-tenant)
└── AdminInvitations.js ← Invitaciones (multi-tenant)
```

## Convención

Cada archivo exporta una función `init()` que recibe el `router` y los `params`:

```js
// views/Dashboard.js
export function init(router, params) {
  // Lógica de inicialización de la vista
  loadCalendar()
  loadStats()
}
```

## Migración desde dashboard.js

1. Identificar el bloque de código de cada feature (están marcados con `// === FEATURE: X ===`)
2. Extraerlo a su archivo correspondiente en `views/`
3. Importarlo desde el orquestador principal
4. El orquestador llama a `init()` cuando el router activa la ruta

## Estado Compartido

Para datos compartidos entre vistas (usuario actual, perfil, etc.), usar:

```js
// store.js (futuro)
import { createStore } from '../store.js'
const store = createStore({ user: null, profile: null, company: null })
```

Mientras tanto, las vistas pueden recibir el estado vía parámetros del router.
