// Mock di api.js per i test UI (iniettato da Playwright al posto di web/api.js).
// Simula un utente loggato con ruolo scelto via ?role=admin|scorekeeper|player
export const DEMO = false;
let D;
const role = new URLSearchParams(location.search).get("role") || "admin";
const uid = () => crypto.randomUUID();
export async function init() { D = await (await fetch("./demo-data.json")).json(); D.ratings = []; D.invites = []; D.profiles = []; D.seasons.forEach((s) => s.is_current = s.name === "2025/2026"); }
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
  async user() { return { id: "u1", email: "test@example.com" }; },
  onChange() {}, async signIn() {}, async signUp() {}, async magicLink() {}, async signOut() {},
  async me() { return { user_id: "u1", email: "test@example.com", role, player_id: role === "admin" ? null : myPlayerId(), nickname: role === "admin" ? null : "Thor" }; },
};
export async function getSettings() { return Object.fromEntries(D.settings.map((s) => [s.key, s.value])); }
export async function getSeasons() { return [...D.seasons].sort((a, b) => b.starts_on.localeCompare(a.starts_on)); }
export async function getPlayers() { return [...D.players]; }
export async function getStandings(id) { return D.v_standings.filter((r) => r.season_id === id); }
export async function getSeasonRatings() { return []; }
export async function getMatches(id) { recompute(); return D.v_matches.filter((m) => m.season_id === id).sort((a, b) => b.played_on.localeCompare(a.played_on)); }
export async function getMatchPlayers(ids) { return D.match_players.filter((mp) => ids.includes(mp.match_id)); }
export async function getMomPoints(id) { return D.v_mom_points.filter((m) => m.season_id === id); }
export async function getMatchRatings(id) {
  const agg = {}; D.ratings.filter((r) => r.match_id === id).forEach((r) => { (agg[r.rated_id] ||= []).push(r.score); });
  return Object.entries(agg).map(([player_id, s]) => ({ match_id: id, player_id, avg_score: s.reduce((a, b) => a + b) / s.length, votes: s.length, is_mvp: false }));
}
export async function getComments({ matchId }) { return D.ratings.filter((r) => r.match_id === matchId && r.comment).map((r) => ({ match_id: r.match_id, player_id: r.rated_id, score: r.score, comment: r.comment, created_at: new Date().toISOString() })); }
export async function getPlayerSeasons(pid) { return D.v_standings.filter((r) => r.player_id === pid && r.played > 0); }
export async function getPlayerMatches() { return []; }
export async function getHallOfFame() { return D.hall_of_fame; }
export async function saveMatch({ id, seasonId, playedOn, result, bianca, nera, notes }) {
  if (!id) { id = uid(); D.v_matches.push({ id, season_id: seasonId, played_on: playedOn, result, notes, season_name: seasonOf(seasonId).name }); }
  else { Object.assign(D.v_matches.find((m) => m.id === id), { season_id: seasonId, played_on: playedOn, result, notes }); D.match_players = D.match_players.filter((mp) => mp.match_id !== id); }
  bianca.forEach((p) => D.match_players.push({ match_id: id, player_id: p, team: "bianca" }));
  nera.forEach((p) => D.match_players.push({ match_id: id, player_id: p, team: "nera" }));
  recompute(); window.__saved = { id, bianca, nera, result }; return id;
}
export async function deleteMatch(id) { D.v_matches = D.v_matches.filter((m) => m.id !== id); }
export async function addMom(x) { D.v_mom_points.push({ id: uid(), season_id: x.seasonId, player_id: x.playerId, match_id: x.matchId, awarded_on: x.awardedOn, source: "manuale", note: x.note }); }
export async function deleteMom(id) { D.v_mom_points = D.v_mom_points.filter((m) => m.id !== id); }
export async function getMyRatings(matchId) { return D.ratings.filter((r) => r.match_id === matchId && r.rater_id === myPlayerId()); }
export async function upsertRatings(rows) { for (const r of rows) { const i = D.ratings.findIndex((x) => x.match_id === r.match_id && x.rater_id === r.rater_id && x.rated_id === r.rated_id); if (i >= 0) D.ratings[i] = { ...D.ratings[i], ...r }; else D.ratings.push({ id: uid(), ...r }); } window.__ratings = D.ratings; }
export async function deleteRating() {}
export async function upsertPlayer(p) { if (p.id) Object.assign(D.players.find((x) => x.id === p.id), p); else D.players.push({ id: uid(), active: true, ...p }); }
export async function upsertSeason(s) { if (s.id) Object.assign(seasonOf(s.id), s); else D.seasons.push({ id: uid(), is_current: false, ...s }); }
export async function setCurrentSeason(id) { D.seasons.forEach((s) => s.is_current = s.id === id); }
export async function getInvites() { return D.invites; }
export async function upsertInvite(i) { D.invites = D.invites.filter((x) => x.email !== i.email); D.invites.push(i); }
export async function deleteInvite(e) { D.invites = D.invites.filter((x) => x.email !== e); }
export async function getProfiles() { return D.profiles; }
export async function updateProfile() {}
export async function saveSetting(k, v) { const s = D.settings.find((x) => x.key === k); if (s) s.value = v; else D.settings.push({ key: k, value: v }); }
export async function upsertHallOfFame(r) { if (r.id) Object.assign(D.hall_of_fame.find((x) => x.id === r.id), r); else D.hall_of_fame.push({ id: uid(), ...r }); }
export async function deleteHallOfFame(id) { D.hall_of_fame = D.hall_of_fame.filter((x) => x.id !== id); }
