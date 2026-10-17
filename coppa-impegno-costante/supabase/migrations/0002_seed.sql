-- Dati storici importati dall'Excel 'Coppa Impegno Costante 25_26.xlsx'. Idempotente.
begin;
insert into public.players (nickname) values
  ('Thor'),
  ('Hal'),
  ('Tyr'),
  ('Nike'),
  ('Parker'),
  ('Athos'),
  ('Kali'),
  ('Xena'),
  ('Brazo'),
  ('Miles'),
  ('Sabo'),
  ('Dalì'),
  ('Nikita'),
  ('Jesus'),
  ('Windy'),
  ('Stout'),
  ('Delta'),
  ('Katana'),
  ('Jalid'),
  ('Golem'),
  ('Matteo'),
  ('Gatto'),
  ('Paola'),
  ('Stein'),
  ('Saiyan'),
  ('Zeppelin'),
  ('Marì'),
  ('Panzer'),
  ('Berserk'),
  ('Majin'),
  ('Che'),
  ('Bud'),
  ('Kong'),
  ('Twice'),
  ('Denise'),
  ('Mcfly'),
  ('Robin'),
  ('Joker'),
  ('Gas'),
  ('Pluto'),
  ('Chill'),
  ('Huracan'),
  ('Jigen')
on conflict do nothing;

insert into public.seasons (name, starts_on, ends_on, min_players_valid, min_matches_ranking, min_matches_efficiency, is_current)
values
  -- Stagione importata: soglia 0 giocatori e 4 partite per riprodurre esattamente i conteggi dell'Excel
  ('2025/2026', '2025-12-01', '2026-06-30', 0, 4, 4, false),
  -- Nuova stagione con le regole del regolamento (12 giocatori, 5 partite per l'efficienza)
  ('2026/2027', '2026-12-01', '2027-06-30', 12, 4, 5, true)
on conflict (name) do nothing;

delete from public.player_ratings r using public.matches m where r.match_id = m.id and m.season_id = (select id from public.seasons where name = '2025/2026');
delete from public.mom_awards where season_id = (select id from public.seasons where name = '2025/2026');
delete from public.matches where season_id = (select id from public.seasons where name = '2025/2026');

with s as (select id from public.seasons where name = '2025/2026'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2025-12-06', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Kali', 'bianca'), ('Brazo', 'bianca'), ('Hal', 'bianca'), ('Parker', 'bianca'), ('Stout', 'bianca'), ('Xena', 'bianca'), ('Panzer', 'bianca'), ('Jalid', 'nera'), ('Nikita', 'nera'), ('Thor', 'nera'), ('Tyr', 'nera'), ('Delta', 'nera'), ('Zeppelin', 'nera'), ('Miles', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, mt.id, '2025-12-06', 'Man of the Match (tabellino)'
from public.seasons s, public.players p, public.matches mt
where s.name = '2025/2026' and lower(p.nickname) = lower('Miles') and mt.season_id = s.id and mt.played_on = '2025-12-06';

with s as (select id from public.seasons where name = '2025/2026'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2025-12-20', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Panzer', 'bianca'), ('Miles', 'bianca'), ('Brazo', 'bianca'), ('Nikita', 'bianca'), ('Che', 'bianca'), ('Stein', 'bianca'), ('Mcfly', 'bianca'), ('Tyr', 'nera'), ('Thor', 'nera'), ('Delta', 'nera'), ('Athos', 'nera'), ('Jesus', 'nera'), ('Parker', 'nera'), ('Windy', 'nera'), ('Xena', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, mt.id, '2025-12-20', 'Man of the Match (tabellino)'
from public.seasons s, public.players p, public.matches mt
where s.name = '2025/2026' and lower(p.nickname) = lower('Xena') and mt.season_id = s.id and mt.played_on = '2025-12-20';

with s as (select id from public.seasons where name = '2025/2026'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2026-01-03', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Delta', 'bianca'), ('Thor', 'bianca'), ('Tyr', 'bianca'), ('Jesus', 'bianca'), ('Windy', 'bianca'), ('Gatto', 'bianca'), ('Paola', 'bianca'), ('Miles', 'nera'), ('Parker', 'nera'), ('Nikita', 'nera'), ('Che', 'nera'), ('Stein', 'nera'), ('Stout', 'nera'), ('Robin', 'nera'), ('Huracan', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, mt.id, '2026-01-03', 'Man of the Match (tabellino)'
from public.seasons s, public.players p, public.matches mt
where s.name = '2025/2026' and lower(p.nickname) = lower('Tyr') and mt.season_id = s.id and mt.played_on = '2026-01-03';

with s as (select id from public.seasons where name = '2025/2026'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2026-01-10', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Jesus', 'bianca'), ('Nikita', 'bianca'), ('Windy', 'bianca'), ('Gatto', 'bianca'), ('Hal', 'bianca'), ('Dalì', 'bianca'), ('Matteo', 'bianca'), ('Thor', 'nera'), ('Parker', 'nera'), ('Miles', 'nera'), ('Stout', 'nera'), ('Panzer', 'nera'), ('Xena', 'nera'), ('Paola', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, mt.id, '2026-01-10', 'Man of the Match (tabellino)'
from public.seasons s, public.players p, public.matches mt
where s.name = '2025/2026' and lower(p.nickname) = lower('Hal') and mt.season_id = s.id and mt.played_on = '2026-01-10';

with s as (select id from public.seasons where name = '2025/2026'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2026-01-17', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Thor', 'bianca'), ('Windy', 'bianca'), ('Miles', 'bianca'), ('Xena', 'bianca'), ('Stein', 'bianca'), ('Panzer', 'bianca'), ('Kali', 'bianca'), ('Stout', 'bianca'), ('Nikita', 'nera'), ('Athos', 'nera'), ('Matteo', 'nera'), ('Parker', 'nera'), ('Brazo', 'nera'), ('Marì', 'nera'), ('Dalì', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, mt.id, '2026-01-17', 'Man of the Match (tabellino)'
from public.seasons s, public.players p, public.matches mt
where s.name = '2025/2026' and lower(p.nickname) = lower('Miles') and mt.season_id = s.id and mt.played_on = '2026-01-17';

with s as (select id from public.seasons where name = '2025/2026'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2026-01-31', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Thor', 'bianca'), ('Tyr', 'bianca'), ('Miles', 'bianca'), ('Paola', 'bianca'), ('Marì', 'bianca'), ('Stein', 'bianca'), ('Stout', 'bianca'), ('Nikita', 'nera'), ('Windy', 'nera'), ('Parker', 'nera'), ('Athos', 'nera'), ('Dalì', 'nera'), ('Hal', 'nera'), ('Brazo', 'nera'), ('Kali', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, mt.id, '2026-01-31', 'Man of the Match (tabellino)'
from public.seasons s, public.players p, public.matches mt
where s.name = '2025/2026' and lower(p.nickname) = lower('Stein') and mt.season_id = s.id and mt.played_on = '2026-01-31';
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, mt.id, '2026-01-31', 'Man of the Match (tabellino)'
from public.seasons s, public.players p, public.matches mt
where s.name = '2025/2026' and lower(p.nickname) = lower('Kali') and mt.season_id = s.id and mt.played_on = '2026-01-31';

with s as (select id from public.seasons where name = '2025/2026'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2026-02-07', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Nikita', 'bianca'), ('Parker', 'bianca'), ('Athos', 'bianca'), ('Dalì', 'bianca'), ('Brazo', 'bianca'), ('Sabo', 'bianca'), ('Thor', 'nera'), ('Hal', 'nera'), ('Miles', 'nera'), ('Kali', 'nera'), ('Stein', 'nera'), ('Panzer', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, mt.id, '2026-02-07', 'Man of the Match (tabellino)'
from public.seasons s, public.players p, public.matches mt
where s.name = '2025/2026' and lower(p.nickname) = lower('Miles') and mt.season_id = s.id and mt.played_on = '2026-02-07';

with s as (select id from public.seasons where name = '2025/2026'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2026-02-14', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Sabo', 'bianca'), ('Parker', 'bianca'), ('Athos', 'bianca'), ('Brazo', 'bianca'), ('Kali', 'bianca'), ('Zeppelin', 'bianca'), ('Nikita', 'nera'), ('Thor', 'nera'), ('Stout', 'nera'), ('Joker', 'nera'), ('Panzer', 'nera'), ('Miles', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, mt.id, '2026-02-14', 'Man of the Match (tabellino)'
from public.seasons s, public.players p, public.matches mt
where s.name = '2025/2026' and lower(p.nickname) = lower('Kali') and mt.season_id = s.id and mt.played_on = '2026-02-14';

with s as (select id from public.seasons where name = '2025/2026'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2026-02-18', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Athos', 'bianca'), ('Nikita', 'bianca'), ('Brazo', 'bianca'), ('Mcfly', 'bianca'), ('Panzer', 'bianca'), ('Miles', 'bianca'), ('Sabo', 'bianca'), ('Parker', 'nera'), ('Thor', 'nera'), ('Kali', 'nera'), ('Hal', 'nera'), ('Jalid', 'nera'), ('Stout', 'nera'), ('Dalì', 'nera'), ('Stein', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);

with s as (select id from public.seasons where name = '2025/2026'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2026-03-07', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Thor', 'bianca'), ('Dalì', 'bianca'), ('Hal', 'bianca'), ('Athos', 'bianca'), ('Gatto', 'bianca'), ('Windy', 'bianca'), ('Nike', 'bianca'), ('Brazo', 'nera'), ('Kali', 'nera'), ('Tyr', 'nera'), ('Delta', 'nera'), ('Miles', 'nera'), ('Sabo', 'nera'), ('Paola', 'nera'), ('Nikita', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, mt.id, '2026-03-07', 'Man of the Match (tabellino)'
from public.seasons s, public.players p, public.matches mt
where s.name = '2025/2026' and lower(p.nickname) = lower('Sabo') and mt.season_id = s.id and mt.played_on = '2026-03-07';

with s as (select id from public.seasons where name = '2025/2026'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2026-03-14', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Hal', 'bianca'), ('Athos', 'bianca'), ('Nikita', 'bianca'), ('Tyr', 'bianca'), ('Miles', 'bianca'), ('Paola', 'bianca'), ('Jesus', 'bianca'), ('Thor', 'nera'), ('Dalì', 'nera'), ('Kali', 'nera'), ('Stout', 'nera'), ('Nike', 'nera'), ('Sabo', 'nera'), ('Katana', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, mt.id, '2026-03-14', 'Man of the Match (tabellino)'
from public.seasons s, public.players p, public.matches mt
where s.name = '2025/2026' and lower(p.nickname) = lower('Hal') and mt.season_id = s.id and mt.played_on = '2026-03-14';

with s as (select id from public.seasons where name = '2025/2026'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2026-03-21', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Hal', 'bianca'), ('Parker', 'bianca'), ('Tyr', 'bianca'), ('Kali', 'bianca'), ('Brazo', 'bianca'), ('Paola', 'bianca'), ('Sabo', 'bianca'), ('Xena', 'bianca'), ('Nike', 'bianca'), ('Stout', 'bianca'), ('Athos', 'nera'), ('Thor', 'nera'), ('Nikita', 'nera'), ('Windy', 'nera'), ('Miles', 'nera'), ('Jesus', 'nera'), ('Katana', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);

with s as (select id from public.seasons where name = '2025/2026'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2026-04-04', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Athos', 'bianca'), ('Thor', 'bianca'), ('Miles', 'bianca'), ('Xena', 'bianca'), ('Katana', 'bianca'), ('Nike', 'bianca'), ('Tyr', 'nera'), ('Dalì', 'nera'), ('Nikita', 'nera'), ('Brazo', 'nera'), ('Delta', 'nera'), ('Stout', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, mt.id, '2026-04-04', 'Man of the Match (tabellino)'
from public.seasons s, public.players p, public.matches mt
where s.name = '2025/2026' and lower(p.nickname) = lower('Thor') and mt.season_id = s.id and mt.played_on = '2026-04-04';

with s as (select id from public.seasons where name = '2025/2026'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2026-04-18', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Kali', 'bianca'), ('Miles', 'bianca'), ('Katana', 'bianca'), ('Sabo', 'bianca'), ('Hal', 'nera'), ('Thor', 'nera'), ('Tyr', 'nera'), ('Brazo', 'nera'), ('Xena', 'nera'), ('Stout', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, mt.id, '2026-04-18', 'Man of the Match (tabellino)'
from public.seasons s, public.players p, public.matches mt
where s.name = '2025/2026' and lower(p.nickname) = lower('Stout') and mt.season_id = s.id and mt.played_on = '2026-04-18';

with s as (select id from public.seasons where name = '2025/2026'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2026-05-02', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Parker', 'bianca'), ('Nikita', 'bianca'), ('Miles', 'bianca'), ('Stout', 'bianca'), ('Delta', 'bianca'), ('Thor', 'nera'), ('Kali', 'nera'), ('Katana', 'nera'), ('Golem', 'nera'), ('Sabo', 'nera'), ('Nike', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, mt.id, '2026-05-02', 'Man of the Match (tabellino)'
from public.seasons s, public.players p, public.matches mt
where s.name = '2025/2026' and lower(p.nickname) = lower('Nike') and mt.season_id = s.id and mt.played_on = '2026-05-02';

with s as (select id from public.seasons where name = '2025/2026'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2026-05-23', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Thor', 'bianca'), ('Miles', 'bianca'), ('Nike', 'bianca'), ('Stout', 'bianca'), ('Delta', 'bianca'), ('Golem', 'bianca'), ('Saiyan', 'bianca'), ('Hal', 'nera'), ('Tyr', 'nera'), ('Parker', 'nera'), ('Sabo', 'nera'), ('Paola', 'nera'), ('Matteo', 'nera'), ('Chill', 'nera'), ('Majin', 'nera'), ('Kali', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, mt.id, '2026-05-23', 'Man of the Match (tabellino)'
from public.seasons s, public.players p, public.matches mt
where s.name = '2025/2026' and lower(p.nickname) = lower('Saiyan') and mt.season_id = s.id and mt.played_on = '2026-05-23';

with s as (select id from public.seasons where name = '2025/2026'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2026-05-30', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Nike', 'bianca'), ('Jesus', 'bianca'), ('Tyr', 'bianca'), ('Saiyan', 'bianca'), ('Berserk', 'bianca'), ('Marì', 'bianca'), ('Matteo', 'bianca'), ('Jalid', 'bianca'), ('Xena', 'bianca'), ('Thor', 'nera'), ('Miles', 'nera'), ('Sabo', 'nera'), ('Nikita', 'nera'), ('Katana', 'nera'), ('Windy', 'nera'), ('Paola', 'nera'), ('Parker', 'nera'), ('Majin', 'nera'), ('Kali', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);

with s as (select id from public.seasons where name = '2025/2026'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2026-06-13', 'bianca' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Tyr', 'bianca'), ('Parker', 'bianca'), ('Xena', 'bianca'), ('Sabo', 'bianca'), ('Katana', 'bianca'), ('Golem', 'bianca'), ('Brazo', 'nera'), ('Miles', 'nera'), ('Stout', 'nera'), ('Saiyan', 'nera'), ('Majin', 'nera'), ('Chill', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, mt.id, '2026-06-13', 'Man of the Match (tabellino)'
from public.seasons s, public.players p, public.matches mt
where s.name = '2025/2026' and lower(p.nickname) = lower('Parker') and mt.season_id = s.id and mt.played_on = '2026-06-13';

with s as (select id from public.seasons where name = '2025/2026'),
     m as (insert into public.matches (season_id, played_on, result) select id, '2026-06-27', 'nera' from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values ('Thor', 'bianca'), ('Stout', 'bianca'), ('Saiyan', 'bianca'), ('Majin', 'bianca'), ('Tyr', 'bianca'), ('Kali', 'bianca'), ('Nike', 'nera'), ('Katana', 'nera'), ('Sabo', 'nera')) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, (select id from public.matches mt where mt.season_id = s.id and mt.played_on = '2025-12-20' limit 1), '2025-12-20', 'MoM aggiuntivo'
from public.seasons s, public.players p
where s.name = '2025/2026' and lower(p.nickname) = lower('Tyr');
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, (select id from public.matches mt where mt.season_id = s.id and mt.played_on = '2025-12-20' limit 1), '2025-12-20', 'MoM aggiuntivo'
from public.seasons s, public.players p
where s.name = '2025/2026' and lower(p.nickname) = lower('Parker');
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, (select id from public.matches mt where mt.season_id = s.id and mt.played_on = '2026-01-10' limit 1), '2026-01-10', 'MoM aggiuntivo'
from public.seasons s, public.players p
where s.name = '2025/2026' and lower(p.nickname) = lower('Panzer');
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, (select id from public.matches mt where mt.season_id = s.id and mt.played_on = '2026-01-31' limit 1), '2026-01-31', 'MoM aggiuntivo'
from public.seasons s, public.players p
where s.name = '2025/2026' and lower(p.nickname) = lower('Brazo');
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, (select id from public.matches mt where mt.season_id = s.id and mt.played_on = '2026-02-14' limit 1), '2026-02-14', 'MoM aggiuntivo'
from public.seasons s, public.players p
where s.name = '2025/2026' and lower(p.nickname) = lower('Brazo');
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, (select id from public.matches mt where mt.season_id = s.id and mt.played_on = '2026-04-04' limit 1), '2026-04-04', 'MoM aggiuntivo'
from public.seasons s, public.players p
where s.name = '2025/2026' and lower(p.nickname) = lower('Thor');
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, (select id from public.matches mt where mt.season_id = s.id and mt.played_on = '2026-04-18' limit 1), '2026-04-18', 'MoM aggiuntivo'
from public.seasons s, public.players p
where s.name = '2025/2026' and lower(p.nickname) = lower('Thor');
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, (select id from public.matches mt where mt.season_id = s.id and mt.played_on = '2026-04-18' limit 1), '2026-04-18', 'MoM aggiuntivo'
from public.seasons s, public.players p
where s.name = '2025/2026' and lower(p.nickname) = lower('Brazo');
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, (select id from public.matches mt where mt.season_id = s.id and mt.played_on = '2026-05-30' limit 1), '2026-05-30', 'MoM aggiuntivo'
from public.seasons s, public.players p
where s.name = '2025/2026' and lower(p.nickname) = lower('Thor');
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, (select id from public.matches mt where mt.season_id = s.id and mt.played_on = '2026-05-30' limit 1), '2026-05-30', 'MoM aggiuntivo'
from public.seasons s, public.players p
where s.name = '2025/2026' and lower(p.nickname) = lower('Nike');
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, (select id from public.matches mt where mt.season_id = s.id and mt.played_on = '2026-05-30' limit 1), '2026-05-30', 'MoM aggiuntivo'
from public.seasons s, public.players p
where s.name = '2025/2026' and lower(p.nickname) = lower('Majin');
insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, (select id from public.matches mt where mt.season_id = s.id and mt.played_on = '2026-06-29' limit 1), '2026-06-29', 'MoM aggiuntivo'
from public.seasons s, public.players p
where s.name = '2025/2026' and lower(p.nickname) = lower('Nike');

delete from public.hall_of_fame;
insert into public.hall_of_fame (season_label, period_label, impegno_winner, impegno_detail, efficienza_winner, efficienza_detail, sort_order) values
  ('2022/2023', '2° quadrimestre', 'Brazo', null, null, null, 1),
  ('2023/2024', '1° quadrimestre', 'Twice', '54 punti, 28 partite', 'Twice', '57,14%', 2),
  ('2023/2024', '2° quadrimestre', 'Miles', '60 punti, 34 partite', 'Jalid', '68,42%', 3),
  ('2024/2025', '2° quadrimestre', 'Nikita', '25 punti, 11 partite', 'Stein, Twice', '85,71%', 4),
  ('2025/2026', 'Stagione intera', 'Thor', '34 punti, 18 partite', 'Nike', '87,5%', 5);

insert into public.settings (key, value) values
  ('regolamento', to_jsonb($txt$La Coppa Impegno Costante (ispirata al grande Dalì) è stata ideata per premiare la costanza e l'impegno durante gli allenamenti: un mini-torneo interno tutti contro tutti che si gioca durante la partita del sabato, dove vengono tracciate vittorie, pareggi, sconfitte e il Man of the Match. A fine periodo viene premiato chi si è distinto per costanza e impegno in base alla classifica punti finale.

DURATA: un unico torneo da dicembre a fine giugno.
PARTECIPANTI: tutti i componenti della squadra che partecipano ad almeno 4 partite.
PARTITE: sono valide tutte le partite del sabato con almeno 12 giocatori.
PUNTEGGIO: a fine allenamento lo score keeper compila il tabellino indicando le due squadre e la vincente (in caso di pareggio entrambe). Dopo la partita ogni giocatore in campo vota i compagni (da 1 a 10, con commento facoltativo): chi ottiene la media più alta è l'MVP della partita e prende il punto Man of the Match.
 - 3 punti per ogni giocatore della squadra vincente
 - 1 punto per ogni giocatore in caso di pareggio
 - 1 punto all'MVP della partita
PREMI: viene premiato il vincitore del torneo, cioè chi totalizza più punti; il premio è offerto e deciso dal direttivo dell'ASD. L'obiettivo è sempre battere il regno di Brazopoli: se accade, Brazo è tenuto a offrire una birra al vincitore (oltre al premio). C'è anche un premio di consolazione, la "Coppa Efficienza", per chi ha la migliore percentuale di vittorie rispetto alle partite giocate (almeno 5 partite) ma non ha avuto un impegno costante. Male!

(il regolamento potrebbe subire modifiche dai poteri forti)$txt$::text)),
  ('app_title', to_jsonb('Coppa Impegno Costante'::text)),
  ('club_name', to_jsonb('ASD Ultimate'::text))
on conflict (key) do update set value = excluded.value, updated_at = now();
commit;
