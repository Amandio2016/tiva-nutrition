-- ─────────────────────────────────────────────────────────────────────────────
-- Tiva Nutrition — Database Schema
-- Corre este ficheiro inteiro no Supabase Dashboard → SQL Editor → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Perfis dos utilizadores ───────────────────────────────────────────────────
create table profiles (
  id             uuid references auth.users on delete cascade primary key,
  name           text,
  email          text,
  avatar_url     text,
  goal           text check (goal in ('ganhar_massa','emagrecer','manter_peso','melhorar_performance')),
  age            integer,
  weight_kg      decimal(5,2),
  height_cm      decimal(5,1),
  activity_level text check (activity_level in ('sedentario','leve','moderado','ativo','muito_ativo')),
  job_type       text check (job_type in ('escritório','trabalho_fisico','misto')),
  sleep_hours    integer default 7,
  training_days  integer default 3,
  available_foods text[] default '{}',
  health_notes   text default '',
  onboarding_completed boolean default false,
  plan_generated       boolean default false,
  created_at     timestamptz default now()
);

-- ── Planos gerados pela IA ────────────────────────────────────────────────────
create table generated_plans (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references profiles(id) on delete cascade,
  plan_data  jsonb not null,
  version    integer default 1,
  is_active  boolean default true,
  created_at timestamptz default now()
);

-- ── Registo de refeições feitas ───────────────────────────────────────────────
create table meal_logs (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references profiles(id) on delete cascade,
  date         date default current_date,
  meal_name    text,
  completed    boolean default false,
  completed_at timestamptz
);

-- ── Registo diário de suplementos ────────────────────────────────────────────
create table supplement_logs (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references profiles(id) on delete cascade,
  date            date default current_date,
  supplement_name text,
  taken           boolean default false,
  taken_at        timestamptz
);

-- ── Registo de treinos ────────────────────────────────────────────────────────
create table training_logs (
  id        uuid default gen_random_uuid() primary key,
  user_id   uuid references profiles(id) on delete cascade,
  date      date default current_date,
  completed boolean default false,
  notes     text
);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table profiles        enable row level security;
alter table generated_plans enable row level security;
alter table meal_logs       enable row level security;
alter table supplement_logs enable row level security;
alter table training_logs   enable row level security;

create policy "users_own_profile"
  on profiles for all using (auth.uid() = id);

create policy "users_own_plans"
  on generated_plans for all using (auth.uid() = user_id);

create policy "users_own_meal_logs"
  on meal_logs for all using (auth.uid() = user_id);

create policy "users_own_supplement_logs"
  on supplement_logs for all using (auth.uid() = user_id);

create policy "users_own_training_logs"
  on training_logs for all using (auth.uid() = user_id);

-- ── Trigger: cria profile ao registar utilizador ──────────────────────────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Utilizador'),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
