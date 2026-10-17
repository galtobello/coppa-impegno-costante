"""Genera supabase/migrations/0002_seed.sql dai dati estratti dall'Excel (data.json)."""
import json, sys, pathlib

data = json.load(open(sys.argv[1], encoding="utf-8"))
out = pathlib.Path(__file__).resolve().parents[1] / "supabase/migrations/0002_seed.sql"

players_xl = ["Thor","Hal","Tyr","Nike","Parker","Athos","Kali","Xena","Brazo","Miles","Sabo","Dalì","Nikita",
    "Jesus","Windy","Stout","Delta","Katana","Jalid","Golem","Matteo","Gatto","Paola","Stein","Saiyan","Zeppelin",
    "Marì","Panzer","Berserk","Majin","Che","Bud","Kong","Twice","Denise","Mcfly","Robin","Joker","Gas","Pluto",
    "Chill","Huracan","Jigen"]
players = list(dict.fromkeys(players_xl + [p for m in data["matches"] for p in m["bianca"] + m["nera"]]
                             + [e["name"] for e in data["extra_mom"]]))

def q(s):
    return "'" + s.replace("'", "''") + "'"

L = []
L.append("-- Dati storici importati dall'Excel 'Coppa Impegno Costante 25_26.xlsx'. Idempotente.")
L.append("begin;")
L.append("insert into public.players (nickname) values\n  " + ",\n  ".join(f"({q(p)})" for p in players)
         + "\non conflict do nothing;")
L.append("""
insert into public.seasons (name, starts_on, ends_on, min_players_valid, min_matches_ranking, min_matches_efficiency, is_current)
values
  -- Stagione importata: soglia 0 giocatori e 4 partite per riprodurre esattamente i conteggi dell'Excel
  ('2025/2026', '2025-12-01', '2026-06-30', 0, 4, 4, false),
  -- Nuova stagione con le regole del regolamento (12 giocatori, 5 partite per l'efficienza)
  ('2026/2027', '2026-12-01', '2027-06-30', 12, 4, 5, true)
on conflict (name) do nothing;
""")
L.append("delete from public.player_ratings r using public.matches m where r.match_id = m.id and m.season_id = (select id from public.seasons where name = '2025/2026');")
L.append("delete from public.mom_awards where season_id = (select id from public.seasons where name = '2025/2026');")
L.append("delete from public.matches where season_id = (select id from public.seasons where name = '2025/2026');")

for i, m in enumerate(sorted(data["matches"], key=lambda x: x["date"])):
    res = "'pareggio'" if (m["win_bianca"] and m["win_nera"]) else ("'bianca'" if m["win_bianca"] else ("'nera'" if m["win_nera"] else "null"))
    L.append(f"""
with s as (select id from public.seasons where name = '2025/2026'),
     m as (insert into public.matches (season_id, played_on, result) select id, '{m["date"]}', {res} from s returning id)
insert into public.match_players (match_id, player_id, team)
select m.id, p.id, t.team::public.team_side
from m, (values {", ".join(f"({q(p)}, 'bianca')" for p in m["bianca"]) + ", " + ", ".join(f"({q(p)}, 'nera')" for p in m["nera"])}) as t(nick, team)
join public.players p on lower(p.nickname) = lower(t.nick);""")
    for mom in m["mom"]:
        L.append(f"""insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, mt.id, '{m["date"]}', 'Man of the Match (tabellino)'
from public.seasons s, public.players p, public.matches mt
where s.name = '2025/2026' and lower(p.nickname) = lower({q(mom)}) and mt.season_id = s.id and mt.played_on = '{m["date"]}';""")

for e in data["extra_mom"]:
    L.append(f"""insert into public.mom_awards (season_id, player_id, match_id, awarded_on, note)
select s.id, p.id, (select id from public.matches mt where mt.season_id = s.id and mt.played_on = '{e["date"]}' limit 1), '{e["date"]}', 'MoM aggiuntivo'
from public.seasons s, public.players p
where s.name = '2025/2026' and lower(p.nickname) = lower({q(e["name"])});""")

L.append("""
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
""")
out.write_text("\n".join(L), encoding="utf-8")
print("written", out, len(players), "players")
