// Mock di api.js per i test UI (iniettato da Playwright al posto di web/api.js).
// Simula un utente loggato con ruolo scelto via ?role=admin|coach|scorekeeper|player|pending|rejected (?role=anon: non loggato)
export const DEMO = false;
let D;
const role = new URLSearchParams(location.search).get("role") || "admin";
const uid = () => crypto.randomUUID();
// ?slow=ms simula la latenza di rete su ogni chiamata (scopre i bug di tempistica che con dati istantanei non emergono)
const SLOW = Number(new URLSearchParams(location.search).get("slow") || 0);
const lag = () => SLOW ? new Promise((r) => setTimeout(r, SLOW * (0.5 + Math.random()))) : Promise.resolve();
export async function init() { D = await (await fetch("./demo-data.json")).json(); D.ratings = []; D.profiles = [
    { id: "u1", email: "test@example.com", role: "admin", status: "approved", player_id: null, created_at: "2026-10-01T10:00:00Z" },
    { id: "u2", email: "thor@example.com", role: "player", status: "pending", requested_nickname: "thor", requested_full_name: "Tommaso Rossi", created_at: "2026-10-17T10:00:00Z" },
    { id: "u3", email: "nuovo@example.com", role: "player", status: "pending", requested_nickname: "Fulmine", requested_full_name: "Luca Bianchi", created_at: "2026-10-18T09:00:00Z" },
    { id: "u4", email: "spam@example.com", role: "player", status: "rejected", requested_nickname: "Boh", requested_full_name: "X", created_at: "2026-10-16T09:00:00Z" }]; const cur = new URLSearchParams(location.search).get("cur") || "2025/2026"; D.seasons.forEach((s) => s.is_current = s.name === cur);
  // ?seedskills: caratteristiche finte per circa 3 giocatori su 4 (valori deterministici)
  if (new URLSearchParams(location.search).has("seedskills")) { D.skills = {}; D.players.forEach((p, i) => { if (i % 4 !== 3) D.skills[p.id] = { player_id: p.id, lancio: (i * 3) % 6, ricezione: (i * 5 + 2) % 6, taglio: (i + 3) % 6, difesa: (i * 2 + 1) % 6, velocita: (i * 7 + 4) % 6, resistenza: (i * 4 + 5) % 6 }; }); }
}
const seasonOf = (id) => D.seasons.find((s) => s.id === id);
const recompute = () => {
  for (const m of D.v_matches) {
    const mp = D.match_players.filter((x) => x.match_id === m.id); const s = seasonOf(m.season_id);
    m.n_players = mp.length; m.n_bianca = mp.filter((x) => x.team === "bianca").length; m.n_nera = m.n_players - m.n_bianca;
    m.is_valid = !!m.result && m.n_players >= s.min_players_valid; m.voting_open = true;
  }
};
const myPlayerId = () => D.players.find((p) => p.nickname === "Thor").id;
export const auth = {
  async user() { await lag(); return role === "anon" ? null : { id: "u1", email: "test@example.com" }; },
  onChange() {}, async signIn() { await lag();}, async signOut() { await lag();}, async magicLink() { await lag();},
  async signUp(email, password, nickname, fullName) { await lag(); window.__signup = { email, nickname, fullName }; },
  async me() { await lag();
    if (["pending", "rejected"].includes(role)) return { user_id: "u1", email: "test@example.com", role: null, player_id: null, status: role, requested_nickname: "Nuovo", requested_full_name: "Mario Rossi" };
    const wp = role !== "admin" || new URLSearchParams(location.search).has("withplayer");
    return { user_id: "u1", email: "test@example.com", role, status: "approved", player_id: wp ? myPlayerId() : null, nickname: wp ? "Thor" : null };
  },
};
export async function getSettings() { await lag(); return Object.fromEntries(D.settings.map((s) => [s.key, s.value])); }
export async function getSeasons() { await lag(); return [...D.seasons].sort((a, b) => b.starts_on.localeCompare(a.starts_on)); }
export async function getPlayers() { await lag(); return [...D.players]; }
export async function getStandings(id) { await lag(); return D.v_standings.filter((r) => r.season_id === id); }
export async function getSeasonRatings() { await lag(); return []; }
export async function getMatches(id) { await lag(); recompute(); return D.v_matches.filter((m) => m.season_id === id).sort((a, b) => b.played_on.localeCompare(a.played_on)); }
export async function getMatchPlayers(ids) { await lag(); return D.match_players.filter((mp) => ids.includes(mp.match_id)); }
export async function getMomPoints(id) { await lag(); return D.v_mom_points.filter((m) => m.season_id === id); }
export async function getMatchRatings(id) { await lag();
  const agg = {}; D.ratings.filter((r) => r.match_id === id).forEach((r) => { (agg[r.rated_id] ||= []).push(r.score); });
  return Object.entries(agg).map(([player_id, s]) => ({ match_id: id, player_id, avg_score: s.reduce((a, b) => a + b) / s.length, votes: s.length, is_mvp: false }));
}
export async function getComments({ matchId, playerId }) { await lag(); return D.ratings.filter((r) => (!matchId || r.match_id === matchId) && (!playerId || r.rated_id === playerId) && r.comment).map((r) => ({ match_id: r.match_id, player_id: r.rated_id, score: null, comment: r.comment, created_at: new Date().toISOString(), rating_id: r.id, author_id: r.rater_id, author_nickname: D.players.find((p) => p.id === r.rater_id)?.nickname })); }
export async function removeComment(id) { await lag(); const r = D.ratings.find((x) => x.id === id); if (r) r.comment = null; window.__removed = id; }
export async function getPlayerSeasons(pid) { await lag(); return D.v_standings.filter((r) => r.player_id === pid && r.played > 0); }
export async function getPlayerMatches(pid) { await lag();
  recompute(); const mps = D.match_players.filter((mp) => mp.player_id === pid);
  return mps.map((mp) => ({ ...D.v_matches.find((m) => m.id === mp.match_id), team: mp.team })).sort((a, b) => b.played_on.localeCompare(a.played_on));
}
export async function getHallOfFame() { await lag(); return D.hall_of_fame; }
export async function saveMatch({ id, seasonId, playedOn, result, bianca, nera, notes, scoreBianca = null, scoreNera = null }) { await lag();
  const sc = { score_bianca: scoreBianca, score_nera: scoreNera };
  if (!id) { id = uid(); D.v_matches.push({ id, season_id: seasonId, played_on: playedOn, result, notes, ...sc, season_name: seasonOf(seasonId).name }); }
  else { Object.assign(D.v_matches.find((m) => m.id === id), { season_id: seasonId, played_on: playedOn, result, notes, ...sc }); D.match_players = D.match_players.filter((mp) => mp.match_id !== id); }
  bianca.forEach((p) => D.match_players.push({ match_id: id, player_id: p, team: "bianca" }));
  nera.forEach((p) => D.match_players.push({ match_id: id, player_id: p, team: "nera" }));
  recompute(); window.__saved = { id, bianca, nera, result, ...sc }; return id;
}
export async function deleteMatch(id) { await lag(); D.v_matches = D.v_matches.filter((m) => m.id !== id); }
export async function addMom(x) { await lag(); D.v_mom_points.push({ id: uid(), season_id: x.seasonId, player_id: x.playerId, match_id: x.matchId, awarded_on: x.awardedOn, source: "manuale", note: x.note }); }
export async function deleteMom(id) { await lag(); D.v_mom_points = D.v_mom_points.filter((m) => m.id !== id); }
export async function getMyRatings(matchId) { await lag(); return D.ratings.filter((r) => r.match_id === matchId && r.rater_id === myPlayerId()); }
export async function upsertRatings(rows) { await lag(); for (const r of rows) { const i = D.ratings.findIndex((x) => x.match_id === r.match_id && x.rater_id === r.rater_id && x.rated_id === r.rated_id); if (i >= 0) D.ratings[i] = { ...D.ratings[i], ...r }; else D.ratings.push({ id: uid(), ...r }); } window.__ratings = D.ratings; }
export async function deleteRating(id) { await lag(); D.ratings = D.ratings.filter((r) => r.id !== id); window.__ratings = D.ratings; }
export async function upsertPlayer(p) { await lag(); if (p.id) Object.assign(D.players.find((x) => x.id === p.id), p); else D.players.push({ id: uid(), active: true, ...p }); }
export async function upsertSeason(s) { await lag(); if (s.id) Object.assign(seasonOf(s.id), s); else D.seasons.push({ id: uid(), is_current: false, ...s }); }
export async function setCurrentSeason(id) { await lag(); D.seasons.forEach((s) => s.is_current = s.id === id); }
export async function getProfiles() { await lag(); return D.profiles; }
export async function updateProfile() { await lag();}
export async function saveSetting(k, v) { await lag(); const s = D.settings.find((x) => x.key === k); if (s) s.value = v; else D.settings.push({ key: k, value: v }); }
export async function upsertHallOfFame(r) { await lag(); if (r.id) Object.assign(D.hall_of_fame.find((x) => x.id === r.id), r); else D.hall_of_fame.push({ id: uid(), ...r }); }
export async function deleteHallOfFame(id) { await lag(); D.hall_of_fame = D.hall_of_fame.filter((x) => x.id !== id); }
export async function getSkills(id) { await lag(); return (D.skills ||= {})[id] || null; }
export async function saveSkills(id, v) { await lag();
  if (!["admin", "coach"].includes(role)) throw new Error("new row violates row-level security policy for table \"player_skills\"");
  (D.skills ||= {})[id] = { player_id: id, ...v }; window.__skills = D.skills[id];
}
export async function approveRegistration(id, role) { await lag();
  const p = D.profiles.find((x) => x.id === id);
  let pl = D.players.find((x) => x.nickname.toLowerCase() === p.requested_nickname.toLowerCase());
  if (!pl) { pl = { id: uid(), nickname: p.requested_nickname, full_name: p.requested_full_name, active: true }; D.players.push(pl); }
  Object.assign(p, { status: "approved", role, player_id: pl.id }); window.__approved = { id, player: pl.nickname, role };
}
export async function rejectRegistration(id) { await lag(); Object.assign(D.profiles.find((x) => x.id === id), { status: "rejected", player_id: null }); }
export async function deleteUser(id) { await lag(); D.profiles = D.profiles.filter((x) => x.id !== id); window.__deleted = id; }
export async function getPlayerMatchRatings(pid) { await lag();
  // voti finti deterministici: media 4-9 su ogni partita giocata, MVP sulle medie >= 8.5
  return D.match_players.filter((mp) => mp.player_id === pid).map((mp, i) => { const v = 4 + ((i * 7) % 11) / 2; return { match_id: mp.match_id, player_id: pid, avg_score: v, votes: 3 + (i % 4), is_mvp: v >= 8.5 }; });
}
export async function getSkillsFor(ids) { await lag(); return Object.values(D.skills ||= {}).filter((x) => ids.includes(x.player_id)); }
