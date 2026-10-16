-- HairPath cloud features (all optional: the app works without any of this).
--   1. items          : plans and journeys synced for signed-in (email) users
--   2. shared_plans   : a plan the client sends to their barber, opened by link (no account for the barber)
--      plan_replies   : the barber's answers, streamed live to the client (Realtime)
--   3. style_tries    : anonymous try-on counts per cut per day ("community pulse"), written by the server only
--
-- Run once in Supabase → SQL Editor. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Synced plans and journeys
-- ---------------------------------------------------------------------------
create table if not exists public.items (
  user_id    uuid    not null default auth.uid() references auth.users on delete cascade,
  kind       text    not null check (kind in ('plan', 'journey')),
  id         uuid    not null,
  updated_at bigint  not null,              -- ms since epoch, the client's own clock (last write wins)
  deleted    boolean not null default false, -- tombstone, so a delete reaches the user's other devices
  data       jsonb,
  primary key (user_id, kind, id),
  constraint items_size check (data is null or octet_length(data::text) < 4000000)
);

alter table public.items enable row level security;

-- Only permanent (email) accounts sync; guest sessions exist only to own shared plans.
drop policy if exists "items: own rows" on public.items;
create policy "items: own rows" on public.items
  for all to authenticated
  using (user_id = (select auth.uid()) and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false))
  with check (user_id = (select auth.uid()) and not coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false));

-- ---------------------------------------------------------------------------
-- 2. Barber link
-- ---------------------------------------------------------------------------
create table if not exists public.shared_plans (
  id         uuid primary key default gen_random_uuid(), -- the link's secret
  owner      uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  opened_at  timestamptz,
  views      int not null default 0,
  plan       jsonb not null,
  constraint shared_plans_size check (octet_length(plan::text) < 2000000)
);

create table if not exists public.plan_replies (
  id         bigint generated always as identity primary key,
  plan_id    uuid not null references public.shared_plans on delete cascade,
  created_at timestamptz not null default now(),
  step       int check (step between 0 and 50),       -- null: a general note
  verdict    text check (verdict in ('can_do', 'talk', 'not_today', 'opened')), -- 'opened': the barber opened the link
  note       text check (char_length(note) <= 500),
  author     text check (char_length(author) <= 60)
);
create index if not exists plan_replies_plan on public.plan_replies (plan_id, id);

alter table public.shared_plans enable row level security;
alter table public.plan_replies enable row level security;

-- The client (owner) manages their own shared plans. Nobody can list other people's.
drop policy if exists "shared_plans: owner" on public.shared_plans;
create policy "shared_plans: owner" on public.shared_plans
  for all to authenticated
  using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()));

-- The owner can read replies to their plans (this is also what lets Realtime deliver them).
drop policy if exists "plan_replies: owner reads" on public.plan_replies;
create policy "plan_replies: owner reads" on public.plan_replies
  for select to authenticated
  using (exists (select 1 from public.shared_plans p where p.id = plan_id and p.owner = (select auth.uid())));

-- The barber has no account: they reach one plan by its id through these functions only.
create or replace function public.get_shared_plan(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'opened_at', p.opened_at,
    'views', p.views,
    'plan', p.plan,
    'replies', coalesce(
      (select jsonb_agg(jsonb_build_object('id', r.id, 'created_at', r.created_at, 'step', r.step, 'verdict', r.verdict, 'note', r.note, 'author', r.author) order by r.id)
         from public.plan_replies r where r.plan_id = p.id),
      '[]'::jsonb)
  )
  from public.shared_plans p
  where p.id = p_id;
$$;

-- Also leaves a small 'opened' event (at most one per 10 minutes) that Realtime streams to the client.
create or replace function public.mark_plan_opened(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.shared_plans set opened_at = now(), views = views + 1 where id = p_id;
  if found and not exists (
    select 1 from public.plan_replies
     where plan_id = p_id and verdict = 'opened' and created_at > now() - interval '10 minutes'
  ) then
    insert into public.plan_replies (plan_id, verdict) values (p_id, 'opened');
  end if;
end;
$$;

create or replace function public.reply_to_plan(p_id uuid, p_step int, p_verdict text, p_note text, p_author text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.plan_replies;
begin
  if not exists (select 1 from public.shared_plans where id = p_id) then
    raise exception 'plan_not_found';
  end if;
  if (select count(*) from public.plan_replies where plan_id = p_id and verdict is distinct from 'opened') >= 300 then
    raise exception 'too_many_replies';
  end if;
  if p_verdict = 'opened' then
    raise exception 'bad_verdict';
  end if;
  if p_verdict is null and nullif(btrim(coalesce(p_note, '')), '') is null then
    raise exception 'empty_reply';
  end if;
  insert into public.plan_replies (plan_id, step, verdict, note, author)
  values (p_id, p_step, p_verdict, nullif(left(btrim(coalesce(p_note, '')), 500), ''), nullif(left(btrim(coalesce(p_author, '')), 60), ''))
  returning * into r;
  return jsonb_build_object('id', r.id, 'created_at', r.created_at, 'step', r.step, 'verdict', r.verdict, 'note', r.note, 'author', r.author);
end;
$$;

-- After signing in on a device that shared plans as a guest, the account takes those plans over,
-- so their live replies follow the user. Only plans still owned by a guest session can move.
create or replace function public.claim_shared_plans(p_ids uuid[])
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    return 0;
  end if;
  update public.shared_plans p set owner = auth.uid()
   where p.id = any(p_ids)
     and p.owner <> auth.uid()
     and exists (select 1 from auth.users u where u.id = p.owner and u.is_anonymous);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.get_shared_plan(uuid) from public;
revoke all on function public.mark_plan_opened(uuid) from public;
revoke all on function public.reply_to_plan(uuid, int, text, text, text) from public;
revoke all on function public.claim_shared_plans(uuid[]) from public;
grant execute on function public.get_shared_plan(uuid) to anon, authenticated;
grant execute on function public.mark_plan_opened(uuid) to anon, authenticated;
grant execute on function public.reply_to_plan(uuid, int, text, text, text) to anon, authenticated;
grant execute on function public.claim_shared_plans(uuid[]) to authenticated;

-- Live updates for the client: new replies, and "your barber opened it". Only the small replies
-- table is streamed; shared_plans holds the preview images and is never broadcast.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'plan_replies') then
    alter publication supabase_realtime add table public.plan_replies;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Community pulse: counts only, never who tried what
-- ---------------------------------------------------------------------------
create table if not exists public.style_tries (
  style_id text not null check (style_id ~ '^[a-z0-9_-]{1,64}$'),
  day      date not null default current_date,
  tries    int  not null default 0,
  primary key (style_id, day)
);
alter table public.style_tries enable row level security; -- no policies: functions only

-- Written by HairPath's server (secret key) when a real try-on starts.
create or replace function public.bump_style_try(p_style text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.style_tries (style_id, day, tries) values (p_style, current_date, 1)
  on conflict (style_id, day) do update set tries = public.style_tries.tries + 1;
$$;
revoke all on function public.bump_style_try(text) from public, anon, authenticated;
grant execute on function public.bump_style_try(text) to service_role;

create or replace function public.style_pulse()
returns table (style_id text, week int, total int)
language sql
stable
security definer
set search_path = ''
as $$
  select style_id,
         coalesce(sum(tries) filter (where day > current_date - 7), 0)::int as week,
         sum(tries)::int as total
    from public.style_tries
   group by style_id;
$$;
revoke all on function public.style_pulse() from public;
grant execute on function public.style_pulse() to anon, authenticated;
