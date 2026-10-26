# Migraciones SQL — Multi-Tenant

## Orden de Ejecución

Ejecutar **en orden** en el SQL Editor de Supabase:

```
001_create_companies.sql
002_company_rls.sql
003_invitations.sql
004_seed_super_admin.sql
```

## ⚠️ Seguridad en Producción

### 1. Revisa `004_seed_super_admin.sql` ANTES de ejecutar

- **Sección 2**: El UPDATE genérico asigna TODOS los usuarios con `company_id IS NULL` a "Legacy Company". Si tienes usuarios de Falabella (@falabella.com), Help.cl (@help.cl), etc., modifica para asignar cada grupo a su compañía correcta.
- **Sección 3**: DESCOMENTA y ajusta el UPDATE del super_admin con el email real.

### 2. Ejecuta todo en UNA sola sesión

Los archivos 001-004 deben ejecutarse en la misma sesión del SQL Editor, idealmente uno tras otro sin cerrar la ventana. Esto minimiza la ventana donde:

- `002_company_rls.sql` ya reemplazó las policies viejas
- `004_seed_super_admin.sql` aún no ha asignado company_id a los admins

Durante ese lapso, los admins legacy (rol='admin') pierden visibilidad de datos ajenos.

### 3. Si algo sale mal

Cada migración usa `BEGIN/COMMIT`. Si una falla, todo se revierte automáticamente. Puedes:

```sql
-- Verificar estado actual de RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar funciones RPC
SELECT proname, prosrc
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
AND proname IN ('is_admin', 'is_super_admin', 'get_user_company_id', 'can_access_company');
```

### 4. Test Post-Migración

Después de ejecutar:

1. Abre el dashboard en una ventana de incógnito
2. Inicia sesión como un usuario regular — ¿ves solo tus datos?
3. Inicia sesión como company_admin — ¿ves los datos de tu compañía?
4. Inicia sesión como super_admin (si ya lo creaste) — ¿ves todo?
5. Crea una invitación desde el backend
6. Verifica que la tabla `company_invitations` tenga los registros

## Archivos

| Archivo | Crea | Riesgo |
|---------|------|--------|
| 001 | Tabla `companies`, columnas en `profiles` | Bajo — usa `IF NOT EXISTS` |
| 002 | 16 RLS policies, 4 RPC functions | Medio — cambia reglas de acceso |
| 003 | Tabla `company_invitations` | Bajo — tabla nueva |
| 004 | Datos semilla | Medio — modifica roles existentes |

## Opción alternativa: Ejecutar como script único

Si prefieres minimizar riesgos, copia todo el contenido de 001+002+003+004 en orden dentro de un único bloque en el SQL Editor. Así todo se ejecuta en una sola transacción.
