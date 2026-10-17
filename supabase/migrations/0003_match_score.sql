-- =====================================================================
-- 0003 · Punteggio (facoltativo) delle partite
-- Aggiunge i punti segnati da Bianca e Nera, li espone in v_matches
-- e li accetta nel salvataggio del tabellino. Idempotente.
-- =====================================================================

alter table public.matches add column if not exists score_bianca smallint check (score_bianca is null or score_bianca >= 0);
alter table public.matches add column if not exists score_nera   smallint check (score_nera   is null or score_nera   >= 0);

-- v_matches: le nuove colonne vanno in coda (create or replace view non può riordinarle)
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

-- save_match con i due punteggi (sostituisce la versione a 7 parametri)
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

-- aggiorna la cache dello schema di PostgREST
notify pgrst, 'reload schema';
