-- 1. Crear la tabla profiles si no existe (Base)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Añadir columnas para la Identidad Operativa Completa
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS nickname TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;

-- 3. Comentarios informativos
COMMENT ON COLUMN public.profiles.nickname IS 'Alias operativo del agente';
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL de la imagen de perfil o base64';
COMMENT ON COLUMN public.profiles.bio IS 'Descripción profesional del agente';
