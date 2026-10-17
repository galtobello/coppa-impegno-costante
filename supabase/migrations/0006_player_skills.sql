-- =====================================================================
-- 0006 · Caratteristiche tecniche dei giocatori (radar a 5 assi, 0–5)
--  Lancio, Ricezione, Taglio, Difesa, Velocità (+ Resistenza dalla 0007).
--  Tutti leggono; solo admin e allenatori (coach) possono scrivere: il
--  vincolo è nelle policy RLS, non solo nell'interfaccia. Idempotente.
-- =====================================================================

create table if not exists public.player_skills (
  player_id   uuid primary key references public.players (id) on delete cascade,
  lancio      smallint not null default 0 check (lancio    between 0 and 5),
  ricezione   smallint not null default 0 check (ricezione between 0 and 5),
  taglio      smallint not null default 0 check (taglio    between 0 and 5),
  difesa      smallint not null default 0 check (difesa    between 0 and 5),
  velocita    smallint not null default 0 check (velocita  between 0 and 5),
  updated_by  uuid default auth.uid(),
  updated_at  timestamptz not null default now()
);

-- admin o allenatore (confronto su testo: vedi 0005)
create or replace function app.can_rate_skills()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role::text in ('admin', 'coach') from public.profiles where id = (select auth.uid())), false);
$$;
grant execute on function app.can_rate_skills() to anon, authenticated;

-- chi ha modificato e quando: impostati dal server, non dal client
create or replace function app.touch_player_skills()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;
create or replace trigger player_skills_touch before insert or update on public.player_skills
  for each row execute function app.touch_player_skills();

alter table public.player_skills enable row level security;
-- create policy solo se mancano (niente drop: idempotente senza istruzioni distruttive)
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'player_skills' and policyname = 'skills_read') then
    create policy skills_read on public.player_skills for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'player_skills' and policyname = 'skills_insert') then
    create policy skills_insert on public.player_skills for insert to authenticated with check ((select app.can_rate_skills()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'player_skills' and policyname = 'skills_update') then
    create policy skills_update on public.player_skills for update to authenticated
      using ((select app.can_rate_skills())) with check ((select app.can_rate_skills()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'player_skills' and policyname = 'skills_delete') then
    create policy skills_delete on public.player_skills for delete to authenticated using ((select app.can_rate_skills()));
  end if;
end $$;

grant select on public.player_skills to anon, authenticated;
grant insert, update, delete on public.player_skills to authenticated;

notify pgrst, 'reload schema';
