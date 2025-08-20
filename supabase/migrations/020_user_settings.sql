-- user settings for privacy & region
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  safety_scan_enabled boolean not null default false,
  share_defaults text not null default 'private', -- 'private' | 'partner' | 'custom'
  region text not null default 'CA-AB',
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "settings_select_own" on public.user_settings
for select using (auth.uid() = user_id);

create policy "settings_insert_own" on public.user_settings
for insert with check (auth.uid() = user_id);

create policy "settings_update_own" on public.user_settings
for update using (auth.uid() = user_id);
