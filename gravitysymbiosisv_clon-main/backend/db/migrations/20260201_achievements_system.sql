-- Achievement System for Gravity Symbiosis

-- 1) Achievement Catalog
create table if not exists public.achievement_definitions (
  id text primary key, -- e.g., 'GRV_TRAIN_5'
  name text not null,
  description text not null,
  category text not null check (category in ('training','closer','knowledge','streak','leaderboard')),
  scope text not null check (scope in ('all_time','annual','personal')),
  icon text not null, -- trophy, crown, medal
  rule_type text not null,
  rule_value int not null,
  tier int not null default 1,
  points_reward int not null default 0,
  created_at timestamptz not null default now()
);

-- 2) User Achievements (Unlocked)
create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievement_definitions(id),
  unlocked_at timestamptz not null default now(),
  claimed_at timestamptz, -- If user claimed the points
  unique (user_id, achievement_id)
);

-- 3) User Stats (All-time, Annual, Personal)
create table if not exists public.user_stats (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  
  -- All-time
  total_points int not null default 0,
  total_training_minutes int not null default 0,
  total_closer_queries int not null default 0,
  total_modules_completed int not null default 0,
  
  -- Annual
  annual_points int not null default 0,
  annual_training_minutes int not null default 0,
  annual_closer_queries int not null default 0,
  
  -- Personal Records (PR)
  pr_max_daily_training_min int not null default 0,
  pr_max_daily_closer_queries int not null default 0,
  
  -- Streaks
  current_streak int not null default 0,
  max_streak int not null default 0,
  last_activity_date date,
  
  updated_at timestamptz not null default now()
);

-- 4) RLS (Row Level Security)
alter table public.achievement_definitions enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_stats enable row level security;

-- Policies
create policy "achievement_defs_read_all" on public.achievement_definitions for select using (true);
create policy "user_achievements_read_own" on public.user_achievements for select using (user_id = auth.uid());
create policy "user_stats_read_own" on public.user_stats for select using (user_id = auth.uid());

-- Triggers for User Stats initialization
create or replace function public.handle_new_user_stats()
returns trigger as $$
begin
  insert into public.user_stats (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_profile_created_create_stats on public.profiles;
create trigger on_profile_created_create_stats
after insert on public.profiles
for each row execute procedure public.handle_new_user_stats();

-- Initial Catalog Data
insert into public.achievement_definitions (id, name, description, category, scope, icon, rule_type, rule_value, tier, points_reward) values
-- Training
('GRV_TRAIN_5', 'Ignición', 'Entrena por 5 minutos acumulados en un día', 'training', 'annual', 'trophy', 'daily_minutes', 5, 1, 10),
('GRV_TRAIN_10', 'Cadencia 10', 'Entrena por 10 minutos acumulados en un día', 'training', 'annual', 'trophy', 'daily_minutes', 10, 1, 20),
('GRV_TRAIN_20', 'Cadencia 20', 'Entrena por 20 minutos acumulados en un día', 'training', 'annual', 'trophy', 'daily_minutes', 20, 2, 40),
('GRV_TRAIN_30', 'Cadencia 30', 'Entrena por 30 minutos acumulados en un día', 'training', 'annual', 'trophy', 'daily_minutes', 30, 2, 60),
('GRV_TRAIN_40', 'Cadencia 40', 'Entrena por 40 minutos acumulados en un día', 'training', 'annual', 'trophy', 'daily_minutes', 40, 3, 80),
('GRV_TRAIN_50', 'Cadencia 50', 'Entrena por 50 minutos acumulados en un día', 'training', 'annual', 'trophy', 'daily_minutes', 50, 3, 100),
('GRV_TRAIN_60', 'Modo Legendario 60', 'Entrena por 60 minutos acumulados en un día', 'training', 'annual', 'crown', 'daily_minutes', 60, 4, 200),
('GRV_TRAIN_TOTAL_600', 'Acero', '600 minutos de entrenamiento totales', 'training', 'all_time', 'medal', 'total_minutes', 600, 4, 1000),

-- Closer
('GRV_CLOSER_5_DAILY', 'Closer: Encendido', 'Realiza 5 consultas al Closer en un día', 'closer', 'annual', 'trophy', 'daily_closer', 5, 1, 15),
('GRV_CLOSER_10_DAILY', 'Closer: Ritmo', 'Realiza 10 consultas al Closer en un día', 'closer', 'annual', 'trophy', 'daily_closer', 10, 2, 30),
('GRV_CLOSER_20_DAILY', 'Closer: Metralla', 'Realiza 20 consultas al Closer en un día', 'closer', 'annual', 'crown', 'daily_closer', 20, 3, 100),
('GRV_CLOSER_100', '100 Consultas', 'Alcanza 100 consultas totales en Closer', 'closer', 'all_time', 'medal', 'total_closer', 100, 3, 500),

-- Knowledge
('GRV_KNOW_1', 'Primer Módulo', 'Completa tu primer módulo de conocimiento', 'knowledge', 'all_time', 'trophy', 'modules_completed', 1, 1, 50),
('GRV_KNOW_100', 'Conocimiento Completo', 'Alcanza el 100% de progreso en el Roadmap', 'knowledge', 'all_time', 'crown', 'knowledge_percent', 100, 4, 1000),

-- Streaks
('GRV_STREAK_7', 'Siete Días de Poder', 'Mantén una racha de 7 días seguidos', 'streak', 'all_time', 'trophy', 'streak_days', 7, 2, 100),
('GRV_STREAK_30', 'Consistencia de Hierro', 'Mantén una racha de 30 días seguidos', 'streak', 'all_time', 'trophy', 'streak_days', 30, 3, 500),
('GRV_STREAK_60', 'La Corona de 60D', 'Completa la campaña de 60 días', 'streak', 'all_time', 'crown', 'streak_days', 60, 4, 1500)
on conflict (id) do nothing;
