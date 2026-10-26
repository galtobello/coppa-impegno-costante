// Verifica di 0011 su un Postgres locale (PGlite, gira in Node): voti nascosti a votazione aperta
// per tutti tranne l'organizzatore, classifica MVP aggiornata solo alla chiusura.
// Prova sia lo schema da zero (0001) sia l'aggiornamento di un database esistente (0001 di git HEAD + 0011).
// Uso (da coppa-impegno-costante/):  npm i --no-save @electric-sql/pglite  &&  node scripts/test_voti_sql.mjs
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const R = fileURLToPath(new URL("..", import.meta.url));
const mig = (f) => readFileSync(`${R}/supabase/migrations/${f}`, "utf8").replace(/create extension if not exists pgcrypto;/, "");
const stub = readFileSync(`${R}/scripts/test_local.sql`, "utf8");
let fails = 0;
const check = (c, l) => { console.log(`${c ? "ok " : "KO "} ${l}`); if (!c) fails++; };

async function setup(path) {
  const db = new PGlite();
  await db.exec(stub); await db.exec("alter table auth.users add column if not exists raw_user_meta_data jsonb default '{}'");
  if (path === "fresh") await db.exec(mig("0001_schema.sql"));
  else {
    // database esistente: schema prima di questa modifica, poi 0011, poi di nuovo 0001 (deve restare idempotente)
    await db.exec(execSync(`git -C ${R} show HEAD:supabase/migrations/0001_schema.sql`).toString().replace(/create extension if not exists pgcrypto;/, ""));
    await db.exec(mig("0011_voti_nascosti.sql"));
    await db.exec(mig("0001_schema.sql"));
    await db.exec(mig("0011_voti_nascosti.sql"));
  }
  await db.exec(`
    insert into seasons (id, name, starts_on, ends_on, voting_days, min_votes_mvp, min_players_valid, is_current)
      values ('10000000-0000-0000-0000-000000000000', 'S', current_date - 100, current_date + 100, 7, 1, 2, true);
    insert into players (id, nickname) values
      ('20000000-0000-0000-0000-000000000001','A'),('20000000-0000-0000-0000-000000000002','B'),
      ('20000000-0000-0000-0000-000000000003','C'),('20000000-0000-0000-0000-000000000004','D');
    insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000001','admin@x.it'),('00000000-0000-0000-0000-000000000002','b@x.it'),('00000000-0000-0000-0000-000000000003','c@x.it');
    update profiles set role='admin', status='approved', player_id='20000000-0000-0000-0000-000000000001' where id='00000000-0000-0000-0000-000000000001';
    update profiles set role='player', status='approved', player_id='20000000-0000-0000-0000-000000000002' where id='00000000-0000-0000-0000-000000000002';
    update profiles set role='coach', status='approved', player_id='20000000-0000-0000-0000-000000000003' where id='00000000-0000-0000-0000-000000000003';
    insert into matches (id, season_id, played_on, result) values
      ('30000000-0000-0000-0000-00000000000c','10000000-0000-0000-0000-000000000000', current_date - 20, 'bianca'),
      ('30000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000000', current_date, 'nera');
    insert into match_players select m::uuid, p, t::team_side from
      (values ('30000000-0000-0000-0000-00000000000c'),('30000000-0000-0000-0000-00000000000a')) mm(m)
      cross join (values ('20000000-0000-0000-0000-000000000001'::uuid,'bianca'),('20000000-0000-0000-0000-000000000002','bianca'),
                         ('20000000-0000-0000-0000-000000000003','nera'),('20000000-0000-0000-0000-000000000004','nera')) pp(p,t);
    insert into player_ratings (match_id, rater_id, rated_id, score, comment)
      select m::uuid, r, d, 6 + (abs(hashtext(r::text || d::text)) % 4), 'c' from
      (values ('30000000-0000-0000-0000-00000000000c'),('30000000-0000-0000-0000-00000000000a')) mm(m),
      (select id r from players) a, (select id d from players) b where r <> d;`);
  return db;
}

async function as(db, uid, sql) {
  await db.exec(uid ? `set role authenticated; select set_config('request.jwt.claim.sub','${uid}',false);` : `set role anon; select set_config('request.jwt.claim.sub','',false);`);
  try { return (await db.query(sql)).rows; } finally { await db.exec("reset role;"); }
}

for (const path of ["fresh", "upgrade"]) {
  console.log(`\n== ${path}`);
  const db = await setup(path);
  const OPEN = "30000000-0000-0000-0000-00000000000a", CLOSED = "30000000-0000-0000-0000-00000000000c";
  const who = { anon: null, player: "00000000-0000-0000-0000-000000000002", coach: "00000000-0000-0000-0000-000000000003", admin: "00000000-0000-0000-0000-000000000001" };
  const { rows: [v] } = await db.query(`select voting_open from v_matches where id = '${OPEN}'`);
  check(v.voting_open === true, "partita di oggi con votazione aperta");
  for (const [w, uid] of Object.entries(who)) {
    const rows = await as(db, uid, "select match_id, voting_closed, is_mvp from v_match_ratings");
    const open = rows.filter((r) => r.match_id === OPEN).length, closed = rows.filter((r) => r.match_id === CLOSED).length;
    check(closed === 4, `${w}: medie della partita chiusa visibili (${closed})`);
    check(w === "admin" ? open === 4 : open === 0, `${w}: medie della partita aperta ${w === "admin" ? "visibili" : "nascoste"} (${open})`);
    check(rows.filter((r) => r.match_id === OPEN).every((r) => r.voting_closed === false && r.is_mvp === false), `${w}: nessun MVP a votazione aperta`);
    const [s] = await as(db, uid, "select sum(votes)::int as votes, sum(rated_matches)::int as rm from v_player_season_ratings");
    check(s.votes === 12 && s.rm === 4, `${w}: classifica MVP solo con la partita chiusa (voti ${s.votes}, partite ${s.rm})`);
    const mom = await as(db, uid, "select match_id from v_mom_points where source = 'mvp'");
    check(mom.length >= 1 && mom.every((r) => r.match_id === CLOSED), `${w}: punti MVP solo da partite chiuse (${mom.length})`);
    const st = await as(db, uid, "select count(*)::int n from v_standings");
    check(st[0].n === 4, `${w}: classifica generale leggibile`);
    const cm = await as(db, uid, `select count(*)::int n from v_player_comments where match_id = '${OPEN}'`);
    check(cm[0].n === 12, `${w}: commenti della partita aperta visibili (${cm[0].n})`);
    if (uid) {
      const raw = await as(db, uid, `select rater_id from player_ratings where match_id = '${OPEN}'`);
      check(w === "admin" ? raw.length === 12 : raw.length === 3, `${w}: voti singoli: ${w === "admin" ? "tutti" : "solo i propri"} (${raw.length})`);
    }
  }
  // alla chiusura (data spostata indietro) i voti diventano visibili a tutti e la classifica si aggiorna
  await db.exec(`update matches set played_on = current_date - 10 where id = '${OPEN}'`);
  const rows = await as(db, null, "select match_id from v_match_ratings");
  check(rows.length === 8, `anon dopo la chiusura: medie di entrambe le partite (${rows.length})`);
  const [s] = await as(db, who.player, "select sum(votes)::int as votes from v_player_season_ratings");
  check(s.votes === 24, `classifica MVP aggiornata alla chiusura (${s.votes} voti)`);
}
console.log(fails ? `\n${fails} PROBLEMI` : "\nTutto ok");
process.exit(fails ? 1 : 0);
