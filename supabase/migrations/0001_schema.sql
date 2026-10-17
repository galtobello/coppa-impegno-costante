-- =====================================================================
--  COPPA IMPEGNO COSTANTE — schema Supabase
--  Eseguire nell'SQL Editor di Supabase (o con `supabase db push`).
--  Idempotente: si può rilanciare senza danni.
-- =====================================================================

create extension if not exists pgcrypto;

-- Schema privato per le funzioni di supporto alle policy (non esposto via API)
create schema if not exists app;
revoke all on schema app from public;

-- ---------------------------------------------------------------------
-- Tipi
-- ---------------------------------------------------------------------
do $$ begin
  create type public.team_side as enum ('bianca', 'nera');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.match_result as enum ('bianca', 'nera', 'pareggio');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_role as enum ('admin', 'scorekeeper', 'player');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Tabelle
-- ---------------------------------------------------------------------

-- Anagrafica giocatori (il nickname è l'identità "sportiva")
create table if not exists public.players (
  id          uuid primary key default gen_random_uuid(),
  nickname    text not null check (length(trim(nickname)) between 1 and 40),
  full_name   text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index if not exists players_nickname_lower_idx on public.players (lower(nickname));

-- Inviti: l'admin associa un'email a un giocatore; alla registrazione con
-- quella email il profilo viene collegato automaticamente al giocatore.
create table if not exists public.player_invites (
  email       text primary key check (email = lower(email)),
  player_id   uuid not null references public.players (id) on delete cascade,
  role        public.user_role not null default 'player',
  created_at  timestamptz not null default now()
);
create index if not exists player_invites_player_id_idx on public.player_invites (player_id);

-- Stagioni/tornei: il regolamento diventa configurazione
create table if not exists public.seasons (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null unique,
  starts_on               date not null,
  ends_on                 date not null check (ends_on >= starts_on),
  points_win              smallint not null default 3,
  points_draw             smallint not null default 1,
  points_mom              smallint not null default 1,
  min_players_valid       smallint not null default 12,  -- partita valida solo con almeno N giocatori
  min_matches_ranking     smallint not null default 4,   -- per vincere la Coppa Impegno Costante
  min_matches_efficiency  smallint not null default 5,   -- per la Coppa Efficienza
  voting_days             smallint not null default 7,   -- giorni dopo la partita in cui si può votare
  min_votes_mvp           smallint not null default 3,   -- voti minimi perché la media valga come MVP
  is_current              boolean not null default false,
  created_at              timestamptz not null default now()
);
create unique index if not exists seasons_one_current_idx on public.seasons (is_current) where is_current;

-- Partite (tabellini)
create table if not exists public.matches (
  id          uuid primary key default gen_random_uuid(),
  season_id   uuid not null references public.seasons (id) on delete cascade,
  played_on   date not null,
  result      public.match_result,              -- null = non ancora registrato
  notes       text,
  created_by  uuid,                             -- auth.users.id (informativo)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- punteggio facoltativo (vedi 0003_match_score.sql)
alter table public.matches add column if not exists score_bianca smallint check (score_bianca is null or score_bianca >= 0);
alter table public.matches add column if not exists score_nera   smallint check (score_nera   is null or score_nera   >= 0);
create index if not exists matches_season_played_idx on public.matches (season_id, played_on desc);

-- Chi ha giocato, in quale squadra
create table if not exists public.match_players (
  match_id    uuid not null references public.matches (id) on delete cascade,
  player_id   uuid not null references public.players (id) on delete restrict,
  team        public.team_side not null,
  primary key (match_id, player_id)
);
create index if not exists match_players_player_id_idx on public.match_players (player_id);

-- Man of the Match assegnati manualmente (storico + "MoM aggiuntivi").
-- Gli MVP calcolati dai voti NON stanno qui: li produce la vista v_match_mvp.
create table if not exists public.mom_awards (
  id          uuid primary key default gen_random_uuid(),
  season_id   uuid not null references public.seasons (id) on delete cascade,
  player_id   uuid not null references public.players (id) on delete cascade,
  match_id    uuid references public.matches (id) on delete set null,
  awarded_on  date not null,
  note        text,
  created_by  uuid,
  created_at  timestamptz not null default now()
);
create index if not exists mom_awards_season_player_idx on public.mom_awards (season_id, player_id);
create index if not exists mom_awards_match_id_idx on public.mom_awards (match_id);

-- Voti tra giocatori: un voto per (partita, votante, votato).
-- Le due FK composte garantiscono che votante e votato abbiano giocato quella partita.
create table if not exists public.player_ratings (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null,
  rater_id    uuid not null,
  rated_id    uuid not null,
  score       smallint not null check (score between 1 and 10),
  comment     text check (comment is null or length(comment) <= 300),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (match_id, rater_id, rated_id),
  check (rater_id <> rated_id),
  foreign key (match_id, rater_id) references public.match_players (match_id, player_id) on delete cascade,
  foreign key (match_id, rated_id) references public.match_players (match_id, player_id) on delete cascade
);
create index if not exists player_ratings_rated_idx on public.player_ratings (rated_id);
create index if not exists player_ratings_rater_idx on public.player_ratings (rater_id);

-- Profili utente: collegano un account di login a un giocatore e a un ruolo
create table if not exists public.profiles (
  id          uuid primary key,                 -- = auth.users.id
  email       text,
  player_id   uuid unique references public.players (id) on delete set null,
  role        public.user_role not null default 'player',
  created_at  timestamptz not null default now()
);

-- Albo d'oro (stagioni passate, anche precedenti all'app)
create table if not exists public.hall_of_fame (
  id                uuid primary key default gen_random_uuid(),
  season_label      text not null,
  period_label      text,
  impegno_winner    text,
  impegno_detail    text,
  efficienza_winner text,
  efficienza_detail text,
  sort_order        int not null default 0
);

-- Impostazioni libere (regolamento, testi, ecc.)
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Trigger di servizio
-- ---------------------------------------------------------------------
create or replace function app.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists matches_touch on public.matches;
create trigger matches_touch before update on public.matches
  for each row execute function app.touch_updated_at();

drop trigger if exists player_ratings_touch on public.player_ratings;
create trigger player_ratings_touch before update on public.player_ratings
  for each row execute function app.touch_updated_at();

-- Alla registrazione di un utente: crea il profilo e, se l'email è tra gli
-- inviti, collega il giocatore e assegna il ruolo. Il primo utente in assoluto
-- diventa admin (bootstrap), così chi installa l'app ne ha subito il controllo.
create or replace function app.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  inv record;
  first_user boolean;
begin
  select not exists (select 1 from public.profiles) into first_user;
  select * into inv from public.player_invites where email = lower(new.email);

  insert into public.profiles (id, email, player_id, role)
  values (
    new.id,
    lower(new.email),
    inv.player_id,
    case when first_user then 'admin'::public.user_role
         else coalesce(inv.role, 'player'::public.user_role) end
  )
  on conflict (id) do nothing;
  return new;
end $$;

-- Questo trigger esiste solo su Supabase (schema auth). Fuori da Supabase viene ignorato.
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema = 'auth' and table_name = 'users') then
    drop trigger if exists on_auth_user_created on auth.users;
    create trigger on_auth_user_created after insert on auth.users
      for each row execute function app.handle_new_user();
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Funzioni di supporto per le policy (security definer, schema privato)
-- ---------------------------------------------------------------------
create or replace function app.my_role()
returns public.user_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function app.my_player_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select player_id from public.profiles where id = (select auth.uid());
$$;

create or replace function app.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role = 'admin' from public.profiles where id = (select auth.uid())), false);
$$;

create or replace function app.can_score()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role in ('admin', 'scorekeeper') from public.profiles where id = (select auth.uid())), false);
$$;

-- Si può votare una partita dal giorno in cui è stata giocata fino a voting_days dopo
create or replace function app.voting_open(p_match_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.matches m
    join public.seasons s on s.id = m.season_id
    where m.id = p_match_id
      and current_date between m.played_on and m.played_on + s.voting_days
  );
$$;

-- Le policy vengono valutate con il ruolo del chiamante: servono usage sullo schema
-- ed execute sulle funzioni. Lo schema "app" NON è esposto dall'API REST di Supabase,
-- quindi queste funzioni non sono chiamabili dall'esterno.
grant usage on schema app to anon, authenticated;
grant execute on function app.my_role(), app.my_player_id(), app.is_admin(), app.can_score(), app.voting_open(uuid)
  to anon, authenticated;

-- Versioni pubbliche (per il frontend: "chi sono?")
create or replace function public.me()
returns table (user_id uuid, email text, role public.user_role, player_id uuid, nickname text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.email, p.role, p.player_id, pl.nickname
  from public.profiles p
  left join public.players pl on pl.id = p.player_id
  where p.id = (select auth.uid());
$$;
grant execute on function public.me() to authenticated;

-- ---------------------------------------------------------------------
-- RPC: salvataggio atomico di un tabellino (soggetto a RLS: security invoker)
-- ---------------------------------------------------------------------
drop function if exists public.save_match(uuid, date, public.match_result, uuid[], uuid[], text, uuid);
create or replace function public.save_match(
  p_season_id    uuid,
  p_played_on    date,
  p_result       public.match_result,
  p_bianca       uuid[],
  p_nera         uuid[],
  p_notes        text default null,
  p_match_id     uuid default null,
  p_score_bianca smallint default null,
  p_score_nera   smallint default null
) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
begin
  if p_bianca && p_nera then
    raise exception 'Un giocatore non può stare in entrambe le squadre';
  end if;

  if p_match_id is null then
    insert into public.matches (season_id, played_on, result, notes, created_by, score_bianca, score_nera)
    values (p_season_id, p_played_on, p_result, p_notes, auth.uid(), p_score_bianca, p_score_nera)
    returning id into v_id;
  else
    update public.matches
       set season_id = p_season_id, played_on = p_played_on, result = p_result, notes = p_notes,
           score_bianca = p_score_bianca, score_nera = p_score_nera
     where id = p_match_id
     returning id into v_id;
    if v_id is null then
      raise exception 'Partita non trovata o non modificabile';
    end if;
    delete from public.match_players
     where match_id = v_id
       and player_id <> all (p_bianca || p_nera);
  end if;

  insert into public.match_players (match_id, player_id, team)
  select v_id, unnest(p_bianca), 'bianca'::public.team_side
  on conflict (match_id, player_id) do update set team = excluded.team;

  insert into public.match_players (match_id, player_id, team)
  select v_id, unnest(p_nera), 'nera'::public.team_side
  on conflict (match_id, player_id) do update set team = excluded.team;

  return v_id;
end $$;
grant execute on function public.save_match(uuid, date, public.match_result, uuid[], uuid[], text, uuid, smallint, smallint) to authenticated;

-- ---------------------------------------------------------------------
-- Viste di calcolo (sostituiscono le formule dell'Excel)
-- Sono "security definer" di proposito: espongono solo dati aggregati/pubblici
-- e mai l'identità di chi ha votato.
-- ---------------------------------------------------------------------

-- Partite con conteggio giocatori e validità
create or replace view public.v_matches as
select m.id, m.season_id, m.played_on, m.result, m.notes, m.created_at, m.updated_at,
       s.name as season_name,
       (select count(*) from public.match_players mp where mp.match_id = m.id)::int as n_players,
       (select count(*) from public.match_players mp where mp.match_id = m.id and mp.team = 'bianca')::int as n_bianca,
       (select count(*) from public.match_players mp where mp.match_id = m.id and mp.team = 'nera')::int as n_nera,
       (m.result is not null
        and (select count(*) from public.match_players mp where mp.match_id = m.id) >= s.min_players_valid) as is_valid,
       (current_date between m.played_on and m.played_on + s.voting_days) as voting_open,
       m.score_bianca, m.score_nera
from public.matches m
join public.seasons s on s.id = m.season_id;

-- Media voti per giocatore in ogni partita (anonima) + flag MVP
create or replace view public.v_match_ratings as
with agg as (
  select r.match_id, r.rated_id as player_id,
         avg(r.score)::numeric as avg_score,
         count(*)::int as votes
  from public.player_ratings r
  group by r.match_id, r.rated_id
),
ranked as (
  select a.*,
         max(a.avg_score) filter (where a.votes >= s.min_votes_mvp)
           over (partition by a.match_id) as best_score,
         s.min_votes_mvp
  from agg a
  join public.matches m on m.id = a.match_id
  join public.seasons s on s.id = m.season_id
)
select match_id, player_id,
       round(avg_score, 2) as avg_score,
       votes,
       (votes >= min_votes_mvp and avg_score = best_score) as is_mvp
from ranked;

-- Commenti ricevuti (anonimi: senza chi li ha scritti)
create or replace view public.v_player_comments as
select r.match_id, r.rated_id as player_id, r.score, r.comment, r.created_at
from public.player_ratings r
where r.comment is not null and length(trim(r.comment)) > 0;

-- Tutti i "punti MoM": assegnazioni manuali + MVP da votazione (solo partite valide)
create or replace view public.v_mom_points as
select a.id, a.season_id, a.player_id, a.match_id, a.awarded_on, 'manuale'::text as source, a.note
from public.mom_awards a
union all
select null::uuid, m.season_id, r.player_id, r.match_id, m.played_on, 'mvp'::text,
       'MVP per media voti (' || r.avg_score || ' su ' || r.votes || ' voti)'
from public.v_match_ratings r
join public.v_matches m on m.id = r.match_id
where r.is_mvp and m.is_valid;

-- Classifica generale per stagione (Coppa Impegno Costante + Coppa Efficienza)
create or replace view public.v_standings as
with part as (
  select m.season_id, mp.player_id,
         count(*)::int as played,
         count(*) filter (where m.result::text = mp.team::text)::int as wins,
         count(*) filter (where m.result = 'pareggio')::int as draws,
         count(*) filter (where m.result <> 'pareggio' and m.result::text <> mp.team::text)::int as losses
  from public.v_matches m
  join public.match_players mp on mp.match_id = m.id
  where m.is_valid
  group by m.season_id, mp.player_id
),
moms as (
  select season_id, player_id, count(*)::int as mom
  from public.v_mom_points
  group by season_id, player_id
),
base as (
  select s.id as season_id, s.name as season_name, p.id as player_id, p.nickname, p.active,
         coalesce(part.played, 0) as played,
         coalesce(part.wins, 0)   as wins,
         coalesce(part.draws, 0)  as draws,
         coalesce(part.losses, 0) as losses,
         coalesce(moms.mom, 0)    as mom,
         coalesce(part.wins, 0) * s.points_win
           + coalesce(part.draws, 0) * s.points_draw
           + coalesce(moms.mom, 0) * s.points_mom as points,
         case when coalesce(part.played, 0) > 0
              then trunc(coalesce(part.wins, 0) * 100.0 / part.played, 2) else 0 end as efficiency,
         coalesce(part.played, 0) >= s.min_matches_ranking    as eligible_ranking,
         coalesce(part.played, 0) >= s.min_matches_efficiency as eligible_efficiency
  from public.seasons s
  cross join public.players p
  left join part on part.season_id = s.id and part.player_id = p.id
  left join moms on moms.season_id = s.id and moms.player_id = p.id
)
select *,
       rank() over (partition by season_id order by points desc, wins desc, played desc, nickname) as rank_points,
       rank() over (partition by season_id
                    order by (case when eligible_efficiency then efficiency else -1 end) desc, played desc, nickname) as rank_efficiency
from base;

-- Medie voti per giocatore per stagione (classifica MVP)
create or replace view public.v_player_season_ratings as
select m.season_id, r.player_id,
       round(avg(r.avg_score), 2) as avg_score,
       sum(r.votes)::int as votes,
       count(*)::int as rated_matches,
       count(*) filter (where r.is_mvp)::int as mvp_count
from public.v_match_ratings r
join public.matches m on m.id = r.match_id
group by m.season_id, r.player_id;

grant select on public.v_matches, public.v_match_ratings, public.v_player_comments,
                public.v_mom_points, public.v_standings, public.v_player_season_ratings
  to anon, authenticated;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.players        enable row level security;
alter table public.player_invites enable row level security;
alter table public.seasons        enable row level security;
alter table public.matches        enable row level security;
alter table public.match_players  enable row level security;
alter table public.mom_awards     enable row level security;
alter table public.player_ratings enable row level security;
alter table public.profiles       enable row level security;
alter table public.hall_of_fame   enable row level security;
alter table public.settings       enable row level security;

-- Pulizia policy (per rilanci)
do $$ declare r record; begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- PLAYERS: tutti leggono, solo admin scrive
create policy players_read  on public.players for select to anon, authenticated using (true);
create policy players_admin on public.players for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));

-- PLAYER_INVITES: solo admin
create policy invites_admin on public.player_invites for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));

-- SEASONS: tutti leggono, solo admin scrive
create policy seasons_read  on public.seasons for select to anon, authenticated using (true);
create policy seasons_admin on public.seasons for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));

-- MATCHES: tutti leggono; score keeper e admin inseriscono/modificano; solo admin cancella
create policy matches_read   on public.matches for select to anon, authenticated using (true);
create policy matches_insert on public.matches for insert to authenticated with check ((select app.can_score()));
create policy matches_update on public.matches for update to authenticated
  using ((select app.can_score())) with check ((select app.can_score()));
create policy matches_delete on public.matches for delete to authenticated using ((select app.is_admin()));

-- MATCH_PLAYERS: come le partite
create policy mp_read   on public.match_players for select to anon, authenticated using (true);
create policy mp_write  on public.match_players for insert to authenticated with check ((select app.can_score()));
create policy mp_update on public.match_players for update to authenticated
  using ((select app.can_score())) with check ((select app.can_score()));
create policy mp_delete on public.match_players for delete to authenticated using ((select app.can_score()));

-- MOM_AWARDS: tutti leggono; score keeper e admin gestiscono
create policy mom_read  on public.mom_awards for select to anon, authenticated using (true);
create policy mom_write on public.mom_awards for all to authenticated
  using ((select app.can_score())) with check ((select app.can_score()));

-- PLAYER_RATINGS: il singolo voto lo vede solo chi l'ha dato (e l'admin).
-- Si vota solo come se stessi, solo partite in cui si è giocato (FK), solo in finestra di voto.
create policy ratings_read on public.player_ratings for select to authenticated
  using (rater_id = (select app.my_player_id()) or (select app.is_admin()));
create policy ratings_insert on public.player_ratings for insert to authenticated
  with check (rater_id = (select app.my_player_id()) and (select app.voting_open(match_id)));
create policy ratings_update on public.player_ratings for update to authenticated
  using (rater_id = (select app.my_player_id()) and (select app.voting_open(match_id)))
  with check (rater_id = (select app.my_player_id()) and (select app.voting_open(match_id)));
create policy ratings_delete on public.player_ratings for delete to authenticated
  using ((rater_id = (select app.my_player_id()) and (select app.voting_open(match_id))) or (select app.is_admin()));

-- PROFILES: ognuno vede il proprio; l'admin vede e modifica tutti (ruoli, collegamento giocatore)
create policy profiles_read_own on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select app.is_admin()));
create policy profiles_admin_update on public.profiles for update to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));
create policy profiles_admin_delete on public.profiles for delete to authenticated
  using ((select app.is_admin()));

-- HALL_OF_FAME e SETTINGS: tutti leggono, solo admin scrive
create policy hof_read  on public.hall_of_fame for select to anon, authenticated using (true);
create policy hof_admin on public.hall_of_fame for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));
create policy settings_read  on public.settings for select to anon, authenticated using (true);
create policy settings_admin on public.settings for all to authenticated
  using ((select app.is_admin())) with check ((select app.is_admin()));

-- Privilegi di base (Supabase li concede già per public; qui per completezza)
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
