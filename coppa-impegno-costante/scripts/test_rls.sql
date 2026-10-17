\set ON_ERROR_STOP off
\set QUIET on
-- utenti
insert into auth.users (id,email) values ('00000000-0000-0000-0000-000000000001','giulio@example.com');  -- primo = admin
-- inviti creati dall'admin
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
insert into public.player_invites (email, player_id, role) select 'stout@example.com', id, 'scorekeeper' from players where nickname='Stout';
insert into public.player_invites (email, player_id, role) select 'thor@example.com', id, 'player' from players where nickname='Thor';
insert into public.player_invites (email, player_id, role) select 'hal@example.com', id, 'player' from players where nickname='Hal';
insert into public.player_invites (email, player_id, role) select 'tyr@example.com', id, 'player' from players where nickname='Tyr';
insert into public.player_invites (email, player_id, role) select 'nike@example.com', id, 'player' from players where nickname='Nike';
reset role;
insert into auth.users (id,email) values ('00000000-0000-0000-0000-000000000002','stout@example.com'),('00000000-0000-0000-0000-000000000003','thor@example.com'),('00000000-0000-0000-0000-000000000004','hal@example.com'),('00000000-0000-0000-0000-000000000005','tyr@example.com'),('00000000-0000-0000-0000-000000000006','nike@example.com');
\set QUIET off
\echo '--- profili creati dal trigger'
select email, role, (select nickname from players where id=player_id) from profiles order by email;

\echo '--- ANON: legge classifica (atteso 1 riga), non legge ratings/profiles/invites (atteso 0 righe)'
set role anon; select set_config('request.jwt.claim.sub','',false);
select count(*)>0 as classifica from v_standings;
select count(*) as ratings from player_ratings; select count(*) as profiles from profiles; select count(*) as invites from player_invites;
\echo '--- ANON: insert partita (atteso ERRORE)'
insert into matches (season_id, played_on) select id, current_date from seasons where is_current;
reset role;

\echo '--- PLAYER Thor: insert partita (atteso ERRORE)'
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
insert into matches (season_id, played_on) select id, current_date from seasons where is_current;
reset role;

\echo '--- SCOREKEEPER Stout: save_match oggi (atteso uuid)'
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select save_match((select id from seasons where is_current), current_date, 'bianca',
  array(select id from players where nickname in ('Thor','Hal','Tyr','Nike','Parker','Athos')),
  array(select id from players where nickname in ('Kali','Xena','Brazo','Miles','Sabo','Dalì'))) as new_match \gset
select :'new_match' as match_id, n_players, is_valid, voting_open from v_matches where id = :'new_match';
\echo '--- SCOREKEEPER: cancella partita (atteso ERRORE/0 righe: solo admin)'
delete from matches where id = :'new_match';
select count(*) as still_there from matches where id = :'new_match';
reset role;

\echo '--- PLAYER Thor vota'
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
\echo '   se stesso (atteso ERRORE check)'
insert into player_ratings (match_id, rater_id, rated_id, score) values (:'new_match', (select id from players where nickname='Thor'), (select id from players where nickname='Thor'), 10);
\echo '   come se fosse Hal (atteso ERRORE RLS)'
insert into player_ratings (match_id, rater_id, rated_id, score) values (:'new_match', (select id from players where nickname='Hal'), (select id from players where nickname='Tyr'), 10);
\echo '   uno che non ha giocato: Stout (atteso ERRORE FK)'
insert into player_ratings (match_id, rater_id, rated_id, score) values (:'new_match', (select id from players where nickname='Thor'), (select id from players where nickname='Stout'), 10);
\echo '   partita vecchia 2026-06-27 (atteso ERRORE RLS: finestra chiusa)'
insert into player_ratings (match_id, rater_id, rated_id, score) values ((select id from matches where played_on='2026-06-27'), (select id from players where nickname='Thor'), (select id from players where nickname='Nike'), 10);
\echo '   voti validi (atteso ok)'
insert into player_ratings (match_id, rater_id, rated_id, score, comment) values
 (:'new_match', (select id from players where nickname='Thor'), (select id from players where nickname='Hal'), 9, 'Grande partita'),
 (:'new_match', (select id from players where nickname='Thor'), (select id from players where nickname='Kali'), 7, null),
 (:'new_match', (select id from players where nickname='Thor'), (select id from players where nickname='Nike'), 8, 'Solido');
reset role;
-- altri votanti
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
insert into player_ratings (match_id, rater_id, rated_id, score) values
 (:'new_match', (select id from players where nickname='Hal'), (select id from players where nickname='Nike'), 10),
 (:'new_match', (select id from players where nickname='Hal'), (select id from players where nickname='Kali'), 6),
 (:'new_match', (select id from players where nickname='Hal'), (select id from players where nickname='Thor'), 9);
reset role;
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000005',false);
insert into player_ratings (match_id, rater_id, rated_id, score, comment) values
 (:'new_match', (select id from players where nickname='Tyr'), (select id from players where nickname='Nike'), 9, 'MVP vero'),
 (:'new_match', (select id from players where nickname='Tyr'), (select id from players where nickname='Hal'), 9, null),
 (:'new_match', (select id from players where nickname='Tyr'), (select id from players where nickname='Kali'), 8, null);
reset role;

\echo '--- PLAYER Thor vede solo i suoi voti (atteso 3)'
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select count(*) from player_ratings;
\echo '--- Thor aggiorna il proprio voto (atteso 1 riga)'
update player_ratings set score = 10 where rated_id = (select id from players where nickname='Hal') returning score;
reset role;

\echo '--- ANON: medie per partita e MVP (Nike 9.00/3 voti e Hal 9.33/2 -> MVP Nike con min 3 voti)'
set role anon; select set_config('request.jwt.claim.sub','',false);
select p.nickname, r.avg_score, r.votes, r.is_mvp from v_match_ratings r join players p on p.id=r.player_id where match_id=:'new_match' order by avg_score desc;
select p.nickname, c.comment from v_player_comments c join players p on p.id=c.player_id order by 1;
\echo '--- classifica 2026/2027 (Nike: 1 vittoria + MVP = 4 punti; partita valida con 12)'
select rank_points, nickname, played, wins, mom, points from v_standings where season_name='2026/2027' and played>0 order by rank_points, nickname limit 4;
reset role;

\echo '--- ADMIN cancella partita (atteso 1)'
set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
delete from matches where id = :'new_match' returning played_on;
select count(*) as ratings_rimasti from player_ratings;
reset role;
