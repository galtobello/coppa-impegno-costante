-- =====================================================================
-- 0011 · Voti nascosti finché la votazione è aperta
--  * v_match_ratings: le medie di una partita con votazione aperta le vede
--    solo l'organizzatore; tutti gli altri (anche senza login) le vedono
--    dalla chiusura. Nuova colonna voting_closed (in coda alla vista).
--  * v_player_season_ratings (classifica MVP): conta solo le partite con
--    votazione chiusa, per tutti, organizzatore compreso: la classifica si
--    aggiorna alla chiusura, con i nuovi voti.
--  * i singoli voti in player_ratings restano visibili solo a chi li ha dati
--    e all'organizzatore (policy invariate); i commenti restano visibili.
--  Idempotente.
-- =====================================================================

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
       (voting_closed and votes >= min_votes_mvp and avg_score = best_score) as is_mvp,
       voting_closed
from ranked
where voting_closed or (select app.is_admin());

create or replace view public.v_player_season_ratings as
select m.season_id, r.player_id,
       round(avg(r.avg_score), 2) as avg_score,
       sum(r.votes)::int as votes,
       count(*)::int as rated_matches,
       count(*) filter (where r.is_mvp)::int as mvp_count
from public.v_match_ratings r
join public.matches m on m.id = r.match_id
where r.voting_closed
group by m.season_id, r.player_id;

grant select on public.v_match_ratings, public.v_player_season_ratings to anon, authenticated;

notify pgrst, 'reload schema';
