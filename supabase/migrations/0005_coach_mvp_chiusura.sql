-- =====================================================================
-- 0005 · Ruolo allenatore + MVP assegnato alla chiusura delle votazioni
--  * nuovo ruolo 'coach' (allenatore): stessi poteri dello score keeper
--    (tabellini e MoM manuali), assegnabile dall'admin
--  * le votazioni restano aperte voting_days giorni a partire dal giorno
--    della partita (7 = una settimana: con le partite del venerdì si vota fino al giovedì, ora italiana)
--  * l'MVP (media più alta, a pari media più MVP) viene assegnato solo
--    quando le votazioni sono chiuse
-- Idempotente.
-- =====================================================================

alter type public.user_role add value if not exists 'coach';

-- confronto su testo: il nuovo valore dell'enum non è usabile nella stessa transazione
create or replace function app.can_score()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role::text in ('admin', 'scorekeeper', 'coach') from public.profiles where id = (select auth.uid())), false);
$$;

-- Si vota dal giorno della partita per voting_days giorni (ora italiana)
create or replace function app.voting_open(p_match_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.matches m
    join public.seasons s on s.id = m.season_id
    where m.id = p_match_id
      and (now() at time zone 'Europe/Rome')::date >= m.played_on
      and (now() at time zone 'Europe/Rome')::date <  m.played_on + s.voting_days
  );
$$;

create or replace view public.v_matches as
select m.id, m.season_id, m.played_on, m.result, m.notes, m.created_at, m.updated_at,
       s.name as season_name,
       (select count(*) from public.match_players mp where mp.match_id = m.id)::int as n_players,
       (select count(*) from public.match_players mp where mp.match_id = m.id and mp.team = 'bianca')::int as n_bianca,
       (select count(*) from public.match_players mp where mp.match_id = m.id and mp.team = 'nera')::int as n_nera,
       (m.result is not null
        and (select count(*) from public.match_players mp where mp.match_id = m.id) >= s.min_players_valid) as is_valid,
       ((now() at time zone 'Europe/Rome')::date >= m.played_on
        and (now() at time zone 'Europe/Rome')::date < m.played_on + s.voting_days) as voting_open,
       m.score_bianca, m.score_nera
from public.matches m
join public.seasons s on s.id = m.season_id;

-- Media voti per giocatore in ogni partita (anonima) + flag MVP, solo a votazioni chiuse
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
         s.min_votes_mvp,
         (now() at time zone 'Europe/Rome')::date >= m.played_on + s.voting_days as voting_closed
  from agg a
  join public.matches m on m.id = a.match_id
  join public.seasons s on s.id = m.season_id
)
select match_id, player_id,
       round(avg_score, 2) as avg_score,
       votes,
       (voting_closed and votes >= min_votes_mvp and avg_score = best_score) as is_mvp
from ranked;

notify pgrst, 'reload schema';
