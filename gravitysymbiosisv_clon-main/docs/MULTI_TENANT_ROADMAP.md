# Multi-Tenant Roadmap: Gravity Symbiosis

## Visión General

Convertir la plataforma de un modelo con un solo admin global a un sistema **multi-tenant** donde cada empresa (compañía) tenga su propio admin que gestione sus usuarios y datos de forma aislada.

---

## Arquitectura Objetivo

```
┌─────────────────────────────────────────────────┐
│                  PLATFORM (us)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ SuperAdmin│  │ SuperAdmin│  │ SuperAdmin│     │
│  └──────────┘  └──────────┘  └──────────┘      │
├─────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐     │
│  │  Company A        │  │  Company B        │     │
│  │  ┌────────────┐  │  │  ┌────────────┐  │     │
│  │  │ Admin (CA)  │  │  │  │ Admin (CA)  │  │     │
│  │  │ User 1      │  │  │  │ User 1      │  │     │
│  │  │ User 2      │  │  │  │ User 2      │  │     │
│  │  │ User 3      │  │  │  │ User 3      │  │     │
│  │  └────────────┘  │  │  └────────────┘  │     │
│  └──────────────────┘  └──────────────────┘     │
└─────────────────────────────────────────────────┘
```

## Roles del Sistema

| Rol | Ámbito | Permisos |
|-----|--------|----------|
| `super_admin` | Global | Crear compañías, asignar company_admins, ver todo |
| `company_admin` | Por compañía | Gestionar usuarios, ver métricas de su compañía, invitar miembros |
| `user` | Por compañía | Usar la plataforma, solo sus datos |

## Estructura de Base de Datos

### Nueva tabla: `companies`

```sql
companies(id, name, slug, logo_url, settings, is_active, created_at, updated_at)
```

### Modificación: `profiles`

Se agregan columnas:
- `company_id UUID REFERENCES companies(id)`
- `invited_by UUID REFERENCES profiles(id)`
- Nueva constraint en `role`: CHECK (`role IN ('super_admin', 'admin', 'user')`)

### Nueva tabla: `company_invitations`

```sql
company_invitations(id, company_id, email, role, token, invited_by, expires_at, accepted_at)
```

### RLS Policies

Todas las tablas existentes deben filtrar por `company_id` en lugar de usar `is_admin()` global. Se crea función `get_user_company_id()` para las políticas.

---

## Plan de Migración (5 Fases)

### FASE 1: Base de Datos (Ejecutar SQL manualmente)

Archivos en `backend/db/migrations/`:

| Archivo | Descripción |
|---------|-------------|
| `001_create_companies.sql` | Tabla companies + migración de perfiles |
| `002_company_rls.sql` | Nuevas RLS policies por compañía |
| `003_invitations.sql` | Sistema de invitaciones |
| `004_seed_super_admin.sql` | Datos iniciales (opcional) |

### FASE 2: Backend - Company Routes

Archivos en `backend/routes/`:

| Archivo | Descripción |
|---------|-------------|
| `company_routes.py` | CRUD de compañías, asignar admins |
| `invitation_routes.py` | Sistema de invitaciones por email |

Se debe registrar cada blueprint en `app.py`.

### FASE 3: Backend - Migrar Endpoints Existentes

Modificar todos los endpoints existentes para que automaticamente:
1. Detecten el `company_id` del usuario logueado
2. Filtren queries por compañía
3. Los admins solo vean datos de su compañía

### FASE 4: Frontend - Router + Modularización

La `dashboard.js` actual tiene ~4000+ líneas en un solo archivo. Para multi-tenant escalable:

1. **Router**: Implementar `frontend/src/router.js` con hash-based routing
2. **Vistas modulares**: Separar cada vista en su propio archivo bajo `frontend/src/views/`
3. **Company Admin views**: Panel específico para company_admin

```
frontend/src/
├── router.js              ← Hash-based SPA router
├── supa-client.js         ← (existente) + métodos company-scoped
├── dashboard.js           ← Refactorizar como orquestador
├── views/
│   ├── Dashboard.js       ← Vista user (existente)
│   ├── DashboardAdmin.js  ← Vista company_admin
│   ├── AdminUsers.js      ← Gestión de usuarios por compañía
│   ├── AdminCompany.js    ← Configuración de la compañía
│   └── ...
├── components/
│   ├── Sidebar.js
│   ├── Topbar.js
│   └── ...
```

### FASE 5: Migración de Datos

Script para asignar usuarios existentes a compañías. Estrategia sugerida:

1. Crear una compañía por defecto "Legacy"
2. Asignar todos los usuarios existentes a esa compañía
3. Los admins actuales se convierten en `company_admin` de Legacy
4. Crear al menos un `super_admin` para la plataforma

---

## Buenas Prácticas

### Backend
- Usar `gunicorn` en producción (ya hay Procfile)
- Mover secrets a variables de entorno (`.env`)
- Agregar logging estructurado
- Validar siempre que el `company_id` del token coincida con la data solicitada

### Frontend
- Migrar Tailwind de CDN a PostCSS (para purgar CSS no usado)
- Implementar lazy-loading de vistas
- Usar `localStorage` con prefijo de compañía para evitar colisiones
- Agregar tipos/JSdocs a las funciones principales

### Base de Datos
- Nunca eliminar columnas viejas sin verificar dependencias
- Usar migraciones versionadas (los archivos `001_`, `002_`, etc.)
- Testear RLS policies con usuarios de diferentes compañías

---

## Cómo Ejecutar las Migraciones

1. Abrir Supabase Studio → SQL Editor
2. Ejecutar los archivos en orden numérico:
   ```sql
   -- Pegar contenido de 001_create_companies.sql → Run
   -- Pegar contenido de 002_company_rls.sql → Run
   -- Pegar contenido de 003_invitations.sql → Run
   ```
3. Verificar con queries de prueba que las policies funcionan
4. Registrar los blueprints en `app.py` y desplegar backend
5. Probar frontend con diferentes roles

---

## Posibles Problemas y Mitigaciones

| Problema | Solución |
|----------|----------|
| Usuarios existentes sin company_id | Migración con valor por defecto + script de asignación |
| RLS existentes bloquean admins legacy | Migrar admins a super_admin temporalmente |
| Datos compartidos entre compañías | Auditoría con `admin_audit_log` antes de mover datos |
| Rendimiento con muchas compañías | Índices en `company_id` + particionamiento si es necesario |

---

## Siguientes Pasos para el Próximo Agente

1. Leer `backend/db/migrations/` y ejecutar en Supabase
2. Registrar blueprints en `backend/app.py`
3. Agregar métodos de company-scope en `frontend/src/supa-client.js`
4. Refactorizar `frontend/src/dashboard.js` usando el `router.js`
5. Ver documentación en `docs/` y `backend/tests/`
