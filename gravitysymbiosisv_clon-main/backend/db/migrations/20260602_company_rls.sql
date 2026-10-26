-- =============================================================================
-- MIGRATION 002: Company-scoped RLS policies
-- =============================================================================
-- Descripción: Reemplaza las policies globales por policies scoped a compañía.
-- Ejecutar en: Supabase SQL Editor
-- Orden: 2/4
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. FUNCIONES AUXILIARES
-- ---------------------------------------------------------------------------

-- Devuelve el company_id del usuario autenticado
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Devuelve true si el usuario autenticado es super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Devuelve true si el usuario autenticado es admin de SU compañía
CREATE OR REPLACE FUNCTION public.is_company_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

-- Helper: ¿el usuario autenticado puede acceder a datos de un company_id dado?
CREATE OR REPLACE FUNCTION public.can_access_company(target_company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT (
    public.is_super_admin()
    OR
    public.get_user_company_id() = target_company_id
  );
$$;

-- ---------------------------------------------------------------------------
-- 1. REMOVER POLICIES EXISTENTES
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "profiles_own_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "training_plans_own_or_admin" ON public.training_plans;
DROP POLICY IF EXISTS "training_sessions_own_or_admin" ON public.training_sessions;
DROP POLICY IF EXISTS "closer_usage_own_or_admin" ON public.closer_usage;
DROP POLICY IF EXISTS "knowledge_progress_own_or_admin" ON public.knowledge_progress;
DROP POLICY IF EXISTS "daily_metrics_own_or_admin" ON public.daily_metrics;
DROP POLICY IF EXISTS "conversations_own_or_admin" ON public.conversations;
DROP POLICY IF EXISTS "messages_own_via_conversation" ON public.messages;
DROP POLICY IF EXISTS "products_own_or_admin" ON public.products;
DROP POLICY IF EXISTS "clients_own_or_admin" ON public.clients;
DROP POLICY IF EXISTS "sales_own_or_admin" ON public.sales;
DROP POLICY IF EXISTS "sale_items_own_via_sales" ON public.sale_items;
DROP POLICY IF EXISTS "objections_own_or_admin" ON public.objections;
DROP POLICY IF EXISTS "admin_audit_log_admin_only" ON public.admin_audit_log;
DROP POLICY IF EXISTS "admin_allowlist_admin_only" ON public.admin_allowlist;

-- ---------------------------------------------------------------------------
-- 2. NUEVAS POLICIES POR COMPAÑÍA
-- ---------------------------------------------------------------------------

-- Estrategia general:
-- - super_admin: puede ver/editar TODO
-- - company_admin: puede ver/editar datos de usuarios en SU compañía
-- - user: solo puede ver/editar SUS propios datos
-- - Se usa la función can_access_company() para validar

-- 2.1 PROFILES
CREATE POLICY "profiles_company_scope" ON public.profiles FOR ALL
USING (
  public.is_super_admin()
  OR id = auth.uid()
  OR (
    public.is_company_admin()
    AND company_id = public.get_user_company_id()
  )
)
WITH CHECK (
  public.is_super_admin()
  OR id = auth.uid()
  OR (
    public.is_company_admin()
    AND company_id = public.get_user_company_id()
  )
);

-- 2.2 TRAINING PLANS
CREATE POLICY "training_plans_company_scope" ON public.training_plans FOR ALL
USING (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = training_plans.user_id
      AND p.company_id = public.get_user_company_id()
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = training_plans.user_id
      AND p.company_id = public.get_user_company_id()
    )
  )
);

-- 2.3 TRAINING SESSIONS
CREATE POLICY "training_sessions_company_scope" ON public.training_sessions FOR ALL
USING (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = training_sessions.user_id
      AND p.company_id = public.get_user_company_id()
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = training_sessions.user_id
      AND p.company_id = public.get_user_company_id()
    )
  )
);

-- 2.4 CLOSER USAGE
CREATE POLICY "closer_usage_company_scope" ON public.closer_usage FOR ALL
USING (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = closer_usage.user_id
      AND p.company_id = public.get_user_company_id()
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = closer_usage.user_id
      AND p.company_id = public.get_user_company_id()
    )
  )
);

-- 2.5 KNOWLEDGE PROGRESS
CREATE POLICY "knowledge_progress_company_scope" ON public.knowledge_progress FOR ALL
USING (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = knowledge_progress.user_id
      AND p.company_id = public.get_user_company_id()
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = knowledge_progress.user_id
      AND p.company_id = public.get_user_company_id()
    )
  )
);

-- 2.6 DAILY METRICS
CREATE POLICY "daily_metrics_company_scope" ON public.daily_metrics FOR ALL
USING (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = daily_metrics.user_id
      AND p.company_id = public.get_user_company_id()
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = daily_metrics.user_id
      AND p.company_id = public.get_user_company_id()
    )
  )
);

-- 2.7 CONVERSATIONS
CREATE POLICY "conversations_company_scope" ON public.conversations FOR ALL
USING (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = conversations.user_id
      AND p.company_id = public.get_user_company_id()
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = conversations.user_id
      AND p.company_id = public.get_user_company_id()
    )
  )
);

-- 2.8 MESSAGES (via conversation -> user -> company)
CREATE POLICY "messages_company_scope" ON public.messages FOR ALL
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (
      c.user_id = auth.uid()
      OR (
        public.is_company_admin()
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = c.user_id
          AND p.company_id = public.get_user_company_id()
        )
      )
    )
  )
);

-- 2.9 PRODUCTS
CREATE POLICY "products_company_scope" ON public.products FOR ALL
USING (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = products.user_id
      AND p.company_id = public.get_user_company_id()
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = products.user_id
      AND p.company_id = public.get_user_company_id()
    )
  )
);

-- 2.10 CLIENTS
CREATE POLICY "clients_company_scope" ON public.clients FOR ALL
USING (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = clients.user_id
      AND p.company_id = public.get_user_company_id()
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = clients.user_id
      AND p.company_id = public.get_user_company_id()
    )
  )
);

-- 2.11 SALES
CREATE POLICY "sales_company_scope" ON public.sales FOR ALL
USING (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = sales.user_id
      AND p.company_id = public.get_user_company_id()
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = sales.user_id
      AND p.company_id = public.get_user_company_id()
    )
  )
);

-- 2.12 SALE ITEMS (via sales -> user -> company)
CREATE POLICY "sale_items_company_scope" ON public.sale_items FOR ALL
USING (
  public.is_super_admin()
  OR EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_items.sale_id
    AND (
      s.user_id = auth.uid()
      OR (
        public.is_company_admin()
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = s.user_id
          AND p.company_id = public.get_user_company_id()
        )
      )
    )
  )
);

-- 2.13 OBJECTIONS
CREATE POLICY "objections_company_scope" ON public.objections FOR ALL
USING (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = objections.user_id
      AND p.company_id = public.get_user_company_id()
    )
  )
)
WITH CHECK (
  public.is_super_admin()
  OR user_id = auth.uid()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = objections.user_id
      AND p.company_id = public.get_user_company_id()
    )
  )
);

-- 2.14 ADMIN AUDIT LOG: super_admin y company_admin pueden ver logs de su compañía
CREATE POLICY "admin_audit_log_company_scope" ON public.admin_audit_log FOR SELECT
USING (
  public.is_super_admin()
  OR (
    public.is_company_admin()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = admin_audit_log.admin_id
      AND p.company_id = public.get_user_company_id()
    )
  )
);

-- 2.15 ADMIN ALLOWLIST: solo super_admin
CREATE POLICY "admin_allowlist_super_admin" ON public.admin_allowlist FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- 2.16 COMPANIES: super_admin puede todo, company_admin puede ver su compañía
CREATE POLICY "companies_super_admin" ON public.companies FOR ALL
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "companies_view_own" ON public.companies FOR SELECT
USING (
  id = public.get_user_company_id()
);

-- ---------------------------------------------------------------------------
-- 3. LEGACY: Mantener is_admin() para código que aún lo usa
-- ---------------------------------------------------------------------------
-- Se actualiza para considerar company_admin y super_admin como admin
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = uid
    AND p.role IN ('admin', 'super_admin')
  );
$$;

COMMIT;
