#!/bin/bash
# Esporta i dati del DB locale in docs/demo-data.json (modalità demo del sito)
set -e
psql -d cic -At -c "
select json_build_object(
  'players', (select json_agg(p) from public.players p),
  'seasons', (select json_agg(s) from public.seasons s),
  'v_matches', (select json_agg(m) from public.v_matches m),
  'match_players', (select json_agg(mp) from public.match_players mp),
  'v_standings', (select json_agg(v) from public.v_standings v),
  'v_mom_points', (select json_agg(v) from public.v_mom_points v),
  'v_match_ratings', coalesce((select json_agg(v) from public.v_match_ratings v), '[]'::json),
  'v_player_comments', coalesce((select json_agg(v) from public.v_player_comments v), '[]'::json),
  'v_player_season_ratings', coalesce((select json_agg(v) from public.v_player_season_ratings v), '[]'::json),
  'hall_of_fame', (select json_agg(h) from public.hall_of_fame h),
  'settings', (select json_agg(s) from public.settings s)
)" > docs/demo-data.json
