create table if not exists public.user_attachment_style (
  user_id uuid primary key references auth.users(id) on delete cascade,
  scores jsonb not null,           -- { anxiety: number, avoidance: number }
  style text not null,             -- 'secure' | 'anxious' | 'avoidant' | 'fearful'
  updated_at timestamptz not null default now()
);
alter table public.user_attachment_style enable row level security;
create policy "attach_select_own" on public.user_attachment_style for select using (auth.uid() = user_id);
create policy "attach_upsert_own" on public.user_attachment_style for insert with check (auth.uid() = user_id);
create policy "attach_update_own" on public.user_attachment_style for update using (auth.uid() = user_id);

create table if not exists public.user_love_languages (
  user_id uuid primary key references auth.users(id) on delete cascade,
  scores jsonb not null,           -- { words: n, acts: n, gifts: n, time: n, touch: n }
  top_two text[] not null,         -- e.g., '{time,touch}'
  updated_at timestamptz not null default now()
);
alter table public.user_love_languages enable row level security;
create policy "ll_select_own" on public.user_love_languages for select using (auth.uid() = user_id);
create policy "ll_upsert_own" on public.user_love_languages for insert with check (auth.uid() = user_id);
create policy "ll_update_own" on public.user_love_languages for update using (auth.uid() = user_id);
