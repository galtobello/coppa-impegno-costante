-- Storico: Coppa Impegno Costante, stagione 2023/2024, 2° quadrimestre (feb–mag 2024).
-- Importato da 'Coppa Impegno Costante (2 Quadrimestre).xlsx' (fogli Febbraio–Maggio; la coppa Campo Grande non è inclusa).
-- Idempotente: rieseguendolo la stagione viene ricreata da zero.
begin;

insert into public.players (nickname, active)
select v.nick, false from (values ('Ice'), ('Lola'), ('Marco'), ('Mariangela'), ('Omar'), ('Sonic'), ('Taz')) as v(nick)
where not exists (select 1 from public.players p where lower(p.nickname) = lower(v.nick));

insert into public.seasons (name, starts_on, ends_on, points_win, points_draw, points_mom, min_players_valid, min_matches_ranking, min_matches_efficiency, voting_days, min_votes_mvp, is_current)
values ('2023/24 · 2° quadrimestre', '2024-02-01', '2024-05-31', 3, 1, 1, 10, 4, 10, 7, 3, false)
on conflict (name) do nothing;

delete from public.mom_awards where season_id = (select id from public.seasons where name = '2023/24 · 2° quadrimestre');
delete from public.matches    where season_id = (select id from public.seasons where name = '2023/24 · 2° quadrimestre');

with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-02-02', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Brazo', 'bianca'), ('Taz', 'bianca'), ('Twice', 'bianca'), ('Hal', 'bianca'), ('Ice', 'bianca'), ('Miles', 'bianca'), ('Sabo', 'bianca'), ('Joker', 'nera'), ('Thor', 'nera'), ('Nike', 'nera'), ('Parker', 'nera'), ('Kali', 'nera'), ('Tyr', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-02-06', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Mcfly', 'bianca'), ('Hal', 'bianca'), ('Twice', 'bianca'), ('Nike', 'bianca'), ('Jalid', 'bianca'), ('Athos', 'bianca'), ('Taz', 'bianca'), ('Tyr', 'bianca'), ('Kali', 'bianca'), ('Thor', 'nera'), ('Nikita', 'nera'), ('Sabo', 'nera'), ('Joker', 'nera'), ('Brazo', 'nera'), ('Ice', 'nera'), ('Parker', 'nera'), ('Miles', 'nera'), ('Stout', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-02-09', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Parker', 'bianca'), ('Joker', 'bianca'), ('Brazo', 'bianca'), ('Miles', 'bianca'), ('Sabo', 'bianca'), ('Twice', 'bianca'), ('Jalid', 'bianca'), ('Mcfly', 'bianca'), ('Taz', 'bianca'), ('Thor', 'nera'), ('Ice', 'nera'), ('Nike', 'nera'), ('Nikita', 'nera'), ('Tyr', 'nera'), ('Stein', 'nera'), ('Golem', 'nera'), ('Athos', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-02-13', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Parker', 'bianca'), ('Joker', 'bianca'), ('Brazo', 'bianca'), ('Miles', 'bianca'), ('Ice', 'bianca'), ('Nike', 'bianca'), ('Mcfly', 'bianca'), ('Stein', 'bianca'), ('Athos', 'bianca'), ('Thor', 'nera'), ('Sabo', 'nera'), ('Twice', 'nera'), ('Jalid', 'nera'), ('Stout', 'nera'), ('Kali', 'nera'), ('Taz', 'nera'), ('Hal', 'nera'), ('Golem', 'nera'), ('Denise', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-02-16', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Thor', 'bianca'), ('Sabo', 'bianca'), ('Twice', 'bianca'), ('Stout', 'bianca'), ('Miles', 'bianca'), ('Kali', 'bianca'), ('Nike', 'bianca'), ('Golem', 'bianca'), ('Parker', 'nera'), ('Joker', 'nera'), ('Brazo', 'nera'), ('Jalid', 'nera'), ('Taz', 'nera'), ('Mcfly', 'nera'), ('Athos', 'nera'), ('Nikita', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-02-20', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Brazo', 'bianca'), ('Joker', 'bianca'), ('Jalid', 'bianca'), ('Taz', 'bianca'), ('Nikita', 'bianca'), ('Sabo', 'bianca'), ('Miles', 'bianca'), ('Mcfly', 'bianca'), ('Athos', 'bianca'), ('Stein', 'bianca'), ('Parker', 'nera'), ('Thor', 'nera'), ('Nike', 'nera'), ('Kali', 'nera'), ('Twice', 'nera'), ('Ice', 'nera'), ('Hal', 'nera'), ('Delta', 'nera'), ('Stout', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-02-23', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Parker', 'bianca'), ('Thor', 'bianca'), ('Jalid', 'bianca'), ('Lola', 'bianca'), ('Sabo', 'bianca'), ('Golem', 'bianca'), ('Athos', 'bianca'), ('Mcfly', 'bianca'), ('Stout', 'bianca'), ('Brazo', 'nera'), ('Twice', 'nera'), ('Ice', 'nera'), ('Nikita', 'nera'), ('Kali', 'nera'), ('Taz', 'nera'), ('Miles', 'nera'), ('Joker', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-02-27', 'pareggio' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Parker', 'bianca'), ('Brazo', 'bianca'), ('Athos', 'bianca'), ('Joker', 'bianca'), ('Jalid', 'bianca'), ('Ice', 'bianca'), ('Kali', 'bianca'), ('Nike', 'bianca'), ('Mcfly', 'bianca'), ('Sabo', 'bianca'), ('Twice', 'nera'), ('Miles', 'nera'), ('Delta', 'nera'), ('Nikita', 'nera'), ('Hal', 'nera'), ('Taz', 'nera'), ('Lola', 'nera'), ('Thor', 'nera'), ('Tyr', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-03-01', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Twice', 'bianca'), ('Thor', 'bianca'), ('Athos', 'bianca'), ('Joker', 'bianca'), ('Taz', 'bianca'), ('Lola', 'bianca'), ('Kali', 'bianca'), ('Mcfly', 'bianca'), ('Sabo', 'bianca'), ('Brazo', 'nera'), ('Miles', 'nera'), ('Parker', 'nera'), ('Jalid', 'nera'), ('Golem', 'nera'), ('Delta', 'nera'), ('Hal', 'nera'), ('Nike', 'nera'), ('Nikita', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-03-05', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Athos', 'bianca'), ('Brazo', 'bianca'), ('Jalid', 'bianca'), ('Kali', 'bianca'), ('Miles', 'bianca'), ('Parker', 'bianca'), ('Taz', 'bianca'), ('Lola', 'bianca'), ('Joker', 'bianca'), ('Stout', 'bianca'), ('Denise', 'bianca'), ('Nikita', 'nera'), ('Nike', 'nera'), ('Thor', 'nera'), ('Mcfly', 'nera'), ('Dalì', 'nera'), ('Twice', 'nera'), ('Ice', 'nera'), ('Golem', 'nera'), ('Stein', 'nera'), ('Sabo', 'nera'), ('Tyr', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-03-08', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Joker', 'bianca'), ('Kali', 'bianca'), ('Twice', 'bianca'), ('Nikita', 'bianca'), ('Thor', 'bianca'), ('Athos', 'bianca'), ('Tyr', 'bianca'), ('Lola', 'bianca'), ('Parker', 'nera'), ('Brazo', 'nera'), ('Jalid', 'nera'), ('Miles', 'nera'), ('Taz', 'nera'), ('Ice', 'nera'), ('Nike', 'nera'), ('Delta', 'nera'), ('Mcfly', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-03-12', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Parker', 'bianca'), ('Brazo', 'bianca'), ('Nikita', 'bianca'), ('Jalid', 'bianca'), ('Taz', 'bianca'), ('Dalì', 'bianca'), ('Ice', 'bianca'), ('Tyr', 'bianca'), ('Delta', 'bianca'), ('Sonic', 'bianca'), ('Miles', 'nera'), ('Athos', 'nera'), ('Thor', 'nera'), ('Nike', 'nera'), ('Hal', 'nera'), ('Golem', 'nera'), ('Twice', 'nera'), ('Joker', 'nera'), ('Lola', 'nera'), ('Kali', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-03-15', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Joker', 'bianca'), ('Twice', 'bianca'), ('Kali', 'bianca'), ('Sabo', 'bianca'), ('Sonic', 'bianca'), ('Jalid', 'bianca'), ('Athos', 'bianca'), ('Mcfly', 'bianca'), ('Brazo', 'bianca'), ('Delta', 'bianca'), ('Ice', 'nera'), ('Parker', 'nera'), ('Miles', 'nera'), ('Taz', 'nera'), ('Nike', 'nera'), ('Thor', 'nera'), ('Hal', 'nera'), ('Golem', 'nera'), ('Lola', 'nera'), ('Tyr', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-03-19', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Brazo', 'bianca'), ('Miles', 'bianca'), ('Kali', 'bianca'), ('Ice', 'bianca'), ('Delta', 'bianca'), ('Tyr', 'bianca'), ('Sonic', 'bianca'), ('Dalì', 'bianca'), ('Nikita', 'bianca'), ('Parker', 'nera'), ('Jalid', 'nera'), ('Taz', 'nera'), ('Nike', 'nera'), ('Thor', 'nera'), ('Athos', 'nera'), ('Mcfly', 'nera'), ('Lola', 'nera'), ('Joker', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-03-22', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Mcfly', 'bianca'), ('Miles', 'bianca'), ('Nikita', 'bianca'), ('Lola', 'bianca'), ('Sabo', 'bianca'), ('Thor', 'bianca'), ('Athos', 'bianca'), ('Stout', 'bianca'), ('Hal', 'nera'), ('Delta', 'nera'), ('Brazo', 'nera'), ('Parker', 'nera'), ('Twice', 'nera'), ('Kali', 'nera'), ('Nike', 'nera'), ('Sonic', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-03-26', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Mcfly', 'bianca'), ('Miles', 'bianca'), ('Brazo', 'bianca'), ('Nike', 'bianca'), ('Twice', 'bianca'), ('Sabo', 'bianca'), ('Stout', 'bianca'), ('Joker', 'bianca'), ('Thor', 'nera'), ('Parker', 'nera'), ('Taz', 'nera'), ('Nikita', 'nera'), ('Ice', 'nera'), ('Lola', 'nera'), ('Golem', 'nera'), ('Denise', 'nera'), ('Tyr', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, mt.id, '2024-03-26', 'Man of the Match (tabellino)'
from public.seasons s join public.matches mt on mt.season_id = s.id and mt.played_on = '2024-03-26'
join public.players p on lower(p.nickname) = lower('Miles')
where s.name = '2023/24 · 2° quadrimestre';
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-03-29', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Nike', 'bianca'), ('Thor', 'bianca'), ('Mcfly', 'bianca'), ('Ice', 'bianca'), ('Hal', 'bianca'), ('Tyr', 'bianca'), ('Golem', 'bianca'), ('Sonic', 'bianca'), ('Joker', 'nera'), ('Miles', 'nera'), ('Parker', 'nera'), ('Twice', 'nera'), ('Kali', 'nera'), ('Taz', 'nera'), ('Sabo', 'nera'), ('Lola', 'nera'), ('Delta', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-04-02', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Miles', 'bianca'), ('Brazo', 'bianca'), ('Lola', 'bianca'), ('Joker', 'bianca'), ('Taz', 'bianca'), ('Ice', 'bianca'), ('Twice', 'nera'), ('Thor', 'nera'), ('Nike', 'nera'), ('Sabo', 'nera'), ('Sonic', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-04-05', 'pareggio' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Golem', 'bianca'), ('Miles', 'bianca'), ('Nike', 'bianca'), ('Parker', 'bianca'), ('Thor', 'bianca'), ('Mcfly', 'bianca'), ('Taz', 'bianca'), ('Athos', 'bianca'), ('Tyr', 'bianca'), ('Sonic', 'bianca'), ('Ice', 'nera'), ('Twice', 'nera'), ('Kali', 'nera'), ('Sabo', 'nera'), ('Stout', 'nera'), ('Nikita', 'nera'), ('Lola', 'nera'), ('Denise', 'nera'), ('Che', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-04-09', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Joker', 'bianca'), ('Nike', 'bianca'), ('Sabo', 'bianca'), ('Taz', 'bianca'), ('Ice', 'bianca'), ('Che', 'bianca'), ('Stein', 'bianca'), ('Lola', 'bianca'), ('Parker', 'nera'), ('Twice', 'nera'), ('Kali', 'nera'), ('Athos', 'nera'), ('Stout', 'nera'), ('Delta', 'nera'), ('Sonic', 'nera'), ('Tyr', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, mt.id, '2024-04-09', 'Man of the Match (tabellino)'
from public.seasons s join public.matches mt on mt.season_id = s.id and mt.played_on = '2024-04-09'
join public.players p on lower(p.nickname) = lower('Joker')
where s.name = '2023/24 · 2° quadrimestre';
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-04-12', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Nikita', 'bianca'), ('Stout', 'bianca'), ('Joker', 'bianca'), ('Miles', 'bianca'), ('Thor', 'bianca'), ('Taz', 'bianca'), ('Sabo', 'bianca'), ('Jalid', 'bianca'), ('Kali', 'bianca'), ('Golem', 'bianca'), ('Ice', 'bianca'), ('Nike', 'nera'), ('Parker', 'nera'), ('Twice', 'nera'), ('Athos', 'nera'), ('Lola', 'nera'), ('Hal', 'nera'), ('Delta', 'nera'), ('Sonic', 'nera'), ('Tyr', 'nera'), ('Omar', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-04-16', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Parker', 'bianca'), ('Jalid', 'bianca'), ('Twice', 'bianca'), ('Ice', 'bianca'), ('Nikita', 'bianca'), ('Dalì', 'bianca'), ('Miles', 'nera'), ('Thor', 'nera'), ('Nike', 'nera'), ('Taz', 'nera'), ('Sabo', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, mt.id, '2024-04-16', 'Man of the Match (tabellino)'
from public.seasons s join public.matches mt on mt.season_id = s.id and mt.played_on = '2024-04-16'
join public.players p on lower(p.nickname) = lower('Nike')
where s.name = '2023/24 · 2° quadrimestre';
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-04-19', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Miles', 'bianca'), ('Sabo', 'bianca'), ('Twice', 'bianca'), ('Mcfly', 'bianca'), ('Ice', 'bianca'), ('Nikita', 'bianca'), ('Joker', 'nera'), ('Taz', 'nera'), ('Parker', 'nera'), ('Hal', 'nera'), ('Golem', 'nera'), ('Delta', 'nera'), ('Sonic', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-04-23', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Joker', 'bianca'), ('Nike', 'bianca'), ('Sabo', 'bianca'), ('Mcfly', 'bianca'), ('Twice', 'bianca'), ('Ice', 'bianca'), ('Dalì', 'bianca'), ('Golem', 'nera'), ('Miles', 'nera'), ('Thor', 'nera'), ('Jalid', 'nera'), ('Stout', 'nera'), ('Taz', 'nera'), ('Sonic', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-04-26', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Thor', 'bianca'), ('Taz', 'bianca'), ('Nike', 'bianca'), ('Jalid', 'bianca'), ('Twice', 'bianca'), ('Golem', 'bianca'), ('Athos', 'bianca'), ('Hal', 'bianca'), ('Sonic', 'bianca'), ('Joker', 'nera'), ('Miles', 'nera'), ('Sabo', 'nera'), ('Mcfly', 'nera'), ('Kali', 'nera'), ('Ice', 'nera'), ('Nikita', 'nera'), ('Delta', 'nera'), ('Dalì', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-04-30', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Thor', 'bianca'), ('Taz', 'bianca'), ('Brazo', 'bianca'), ('Nike', 'bianca'), ('Miles', 'bianca'), ('Twice', 'bianca'), ('Stein', 'bianca'), ('Mariangela', 'bianca'), ('Mcfly', 'nera'), ('Kali', 'nera'), ('Stout', 'nera'), ('Sonic', 'nera'), ('Nikita', 'nera'), ('Che', 'nera'), ('Hal', 'nera'), ('Sabo', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-05-03', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Thor', 'bianca'), ('Taz', 'bianca'), ('Brazo', 'bianca'), ('Kali', 'bianca'), ('Miles', 'bianca'), ('Nikita', 'bianca'), ('Hal', 'bianca'), ('Parker', 'bianca'), ('Sabo', 'nera'), ('Nike', 'nera'), ('Twice', 'nera'), ('Athos', 'nera'), ('Sonic', 'nera'), ('Dalì', 'nera'), ('Stein', 'nera'), ('Jesus', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-05-07', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Thor', 'bianca'), ('Joker', 'bianca'), ('Nike', 'bianca'), ('Parker', 'bianca'), ('Sabo', 'bianca'), ('Stout', 'bianca'), ('Sonic', 'bianca'), ('Delta', 'bianca'), ('Brazo', 'bianca'), ('Taz', 'nera'), ('Miles', 'nera'), ('Kali', 'nera'), ('Nikita', 'nera'), ('Ice', 'nera'), ('Che', 'nera'), ('Dalì', 'nera'), ('Hal', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-05-10', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Nike', 'bianca'), ('Parker', 'bianca'), ('Jalid', 'bianca'), ('Brazo', 'bianca'), ('Mcfly', 'bianca'), ('Golem', 'bianca'), ('Sonic', 'bianca'), ('Taz', 'nera'), ('Miles', 'nera'), ('Thor', 'nera'), ('Kali', 'nera'), ('Sabo', 'nera'), ('Nikita', 'nera'), ('Stout', 'nera'), ('Mariangela', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-05-14', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Miles', 'bianca'), ('Thor', 'bianca'), ('Sabo', 'bianca'), ('Ice', 'bianca'), ('Tyr', 'bianca'), ('Dalì', 'bianca'), ('Taz', 'nera'), ('Nike', 'nera'), ('Golem', 'nera'), ('Delta', 'nera'), ('Sonic', 'nera'), ('Che', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-05-17', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Delta', 'bianca'), ('Miles', 'bianca'), ('Taz', 'bianca'), ('Nike', 'bianca'), ('Parker', 'bianca'), ('Jalid', 'bianca'), ('Mcfly', 'bianca'), ('Hal', 'bianca'), ('Golem', 'bianca'), ('Ice', 'bianca'), ('Sabo', 'nera'), ('Kali', 'nera'), ('Brazo', 'nera'), ('Twice', 'nera'), ('Nikita', 'nera'), ('Stout', 'nera'), ('Sonic', 'nera'), ('Tyr', 'nera'), ('Dalì', 'nera'), ('Stein', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-05-21', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Miles', 'bianca'), ('Taz', 'bianca'), ('Mcfly', 'bianca'), ('Sabo', 'bianca'), ('Che', 'bianca'), ('Sonic', 'bianca'), ('Nikita', 'bianca'), ('Dalì', 'bianca'), ('Thor', 'nera'), ('Nike', 'nera'), ('Kali', 'nera'), ('Hal', 'nera'), ('Golem', 'nera'), ('Twice', 'nera'), ('Brazo', 'nera'), ('Ice', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-05-24', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Taz', 'bianca'), ('Thor', 'bianca'), ('Hal', 'bianca'), ('Miles', 'bianca'), ('Sabo', 'bianca'), ('Kali', 'bianca'), ('Nikita', 'bianca'), ('Twice', 'bianca'), ('Parker', 'nera'), ('Brazo', 'nera'), ('Nike', 'nera'), ('Stout', 'nera'), ('Sonic', 'nera'), ('Delta', 'nera'), ('Tyr', 'nera'), ('Dalì', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-05-28', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Parker', 'bianca'), ('Nikita', 'bianca'), ('Taz', 'bianca'), ('Sonic', 'bianca'), ('Che', 'bianca'), ('Miles', 'nera'), ('Nike', 'nera'), ('Twice', 'nera'), ('Kali', 'nera'), ('Brazo', 'nera'), ('Ice', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
with s as (select id from public.seasons where name = '2023/24 · 2° quadrimestre'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2024-05-31', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Taz', 'bianca'), ('Che', 'bianca'), ('Dalì', 'bianca'), ('Ice', 'bianca'), ('Stout', 'bianca'), ('Nikita', 'bianca'), ('Kali', 'bianca'), ('Mcfly', 'bianca'), ('Marco', 'bianca'), ('Miles', 'nera'), ('Brazo', 'nera'), ('Thor', 'nera'), ('Parker', 'nera'), ('Delta', 'nera'), ('Sabo', 'nera'), ('Sonic', 'nera'), ('Nike', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);

commit;
