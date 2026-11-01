-- Winner: esquema do banco. Idempotente: pode rodar várias vezes.
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text not null unique,
  password_hash text not null,
  display_name text not null default '',
  theme text not null default 'system' check (theme in ('light','dark','system')),
  onboarding jsonb not null default '{}'::jsonb,
  onboarded_at timestamptz,
  setup_step int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  id text primary key,                -- sha256 do token do cookie
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_idx on sessions(user_id);

create table if not exists passkeys (
  id text primary key,                -- credential id (base64url)
  user_id uuid not null references users(id) on delete cascade,
  public_key bytea not null,
  counter bigint not null default 0,
  transports text[] not null default '{}',
  device_name text not null default '',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists passkeys_user_idx on passkeys(user_id);

create table if not exists auth_challenges (
  id text primary key,
  challenge text not null,
  user_id uuid references users(id) on delete cascade,
  expires_at timestamptz not null
);

create table if not exists routine_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  start_time text not null check (start_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  end_time text not null check (end_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  weekdays int[] not null default '{1,2,3,4,5}',
  category text not null default 'pessoal',
  created_at timestamptz not null default now()
);
create index if not exists routine_user_idx on routine_activities(user_id);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  notes text not null default '',
  recurrence text not null check (recurrence in ('once','daily','weekly','biweekly','monthly')),
  weekdays int[] not null default '{}',
  month_day int,                       -- 1..31, 0 = último dia do mês
  anchor_date date not null default current_date,
  time text,
  priority text not null default 'normal' check (priority in ('normal','high')),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_idx on tasks(user_id);

create table if not exists task_completions (
  task_id uuid not null references tasks(id) on delete cascade,
  occurrence date not null,
  completed_at timestamptz not null default now(),
  primary key (task_id, occurrence)
);

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('good','desired','bad')),
  per_week int not null default 7 check (per_week between 1 and 7),
  time text,
  reason text not null default '',
  triggers text not null default '',
  replacement text not null default '',
  start_date date not null default current_date,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists habits_user_idx on habits(user_id);

create table if not exists habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references habits(id) on delete cascade,
  date date not null,
  type text not null check (type in ('done','relapse','resist')),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists habit_logs_habit_idx on habit_logs(habit_id, date);
create unique index if not exists habit_logs_done_once on habit_logs(habit_id, date) where type = 'done';

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  text text not null,
  remind_at timestamptz not null,
  repeat text not null default 'none' check (repeat in ('none','daily','weekdays','weekly','monthly','yearly')),
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reminders_user_idx on reminders(user_id, remind_at);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null default '',
  body text not null default '',
  tag text not null default '',
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notes_user_idx on notes(user_id);
