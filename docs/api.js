// Livello dati: Supabase quando configurato, altrimenti modalità demo (sola lettura).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js?v=202610181501";

export const DEMO = SUPABASE_URL.includes("YOUR-PROJECT") || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.startsWith("YOUR");

let sb = null;      // client supabase
let demo = null;    // dati demo

export async function init() {
  if (DEMO) {
    demo = await (await fetch("./demo-data.json?v=202610181501")).json();
    return;
  }
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function unwrap({ data, error }) {
  if (error) throw new Error(error.message || String(error));
  return data;
}

// ------------------------------------------------------------------ auth
export const auth = {
  async user() {
    if (DEMO) return null;
    const { data } = await sb.auth.getSession();
    return data.session?.user || null;
  },
  onChange(cb) {
    if (DEMO) return;
    sb.auth.onAuthStateChange((_e, session) => cb(session?.user || null));
  },
  async signIn(email, password) {
    return unwrap(await sb.auth.signInWithPassword({ email, password }));
  },
  // nickname e nome finiscono nei metadati dell'utente: il database li copia nella richiesta di registrazione
  async signUp(email, password, nickname, fullName) {
    return unwrap(await sb.auth.signUp({ email, password, options: { data: { nickname, full_name: fullName }, emailRedirectTo: location.origin + location.pathname } }));
  },
  // solo accesso: un nuovo account si crea dalla registrazione (con nickname e nome)
  async magicLink(email) {
    return unwrap(await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname } }));
  },
  async signOut() { await sb.auth.signOut(); },
  async me() {
    if (DEMO) return null;
    const rows = unwrap(await sb.rpc("me"));
    const me = rows?.[0];
    if (!me) return null;
    const prof = unwrap(await sb.from("profiles").select("status,requested_nickname,requested_full_name").eq("id", me.user_id))[0] || {};
    const ok = (prof.status || "approved") === "approved";
    // finché la registrazione non è approvata l'utente non ha ruolo né giocatore (lo impone anche il database)
    return { ...me, ...prof, status: prof.status || "approved", role: ok ? me.role : null, player_id: ok ? me.player_id : null };
  },
};

// ------------------------------------------------------------------ letture
export async function getSettings() {
  if (DEMO) return Object.fromEntries(demo.settings.map((s) => [s.key, s.value]));
  const rows = unwrap(await sb.from("settings").select("key,value"));
  return Object.fromEntries(rows.map((s) => [s.key, s.value]));
}

export async function getSeasons() {
  if (DEMO) return [...demo.seasons].sort((a, b) => b.starts_on.localeCompare(a.starts_on));
  return unwrap(await sb.from("seasons").select("*").order("starts_on", { ascending: false }));
}

export async function getPlayers(onlyActive = false) {
  let rows = DEMO ? demo.players : unwrap(await sb.from("players").select("*").order("nickname"));
  if (onlyActive) rows = rows.filter((p) => p.active);
  return [...rows].sort((a, b) => a.nickname.localeCompare(b.nickname, "it"));
}

export async function getStandings(seasonId) {
  if (DEMO) return demo.v_standings.filter((r) => r.season_id === seasonId);
  return unwrap(await sb.from("v_standings").select("*").eq("season_id", seasonId));
}

export async function getSeasonRatings(seasonId) {
  if (DEMO) return demo.v_player_season_ratings.filter((r) => r.season_id === seasonId);
  return unwrap(await sb.from("v_player_season_ratings").select("*").eq("season_id", seasonId));
}

export async function getMatches(seasonId) {
  if (DEMO) return demo.v_matches.filter((m) => m.season_id === seasonId).sort((a, b) => b.played_on.localeCompare(a.played_on));
  return unwrap(await sb.from("v_matches").select("*").eq("season_id", seasonId).order("played_on", { ascending: false }));
}

export async function getMatchPlayers(matchIds) {
  if (DEMO) return demo.match_players.filter((mp) => matchIds.includes(mp.match_id));
  if (!matchIds.length) return [];
  return unwrap(await sb.from("match_players").select("match_id,player_id,team").in("match_id", matchIds));
}

export async function getMomPoints(seasonId) {
  if (DEMO) return demo.v_mom_points.filter((m) => m.season_id === seasonId);
  return unwrap(await sb.from("v_mom_points").select("*").eq("season_id", seasonId));
}

export async function getMatchRatings(matchId) {
  if (DEMO) return demo.v_match_ratings.filter((r) => r.match_id === matchId);
  return unwrap(await sb.from("v_match_ratings").select("*").eq("match_id", matchId));
}

export async function getComments({ matchId, playerId }) {
  if (DEMO) return demo.v_player_comments.filter((c) => (!matchId || c.match_id === matchId) && (!playerId || c.player_id === playerId));
  let q = sb.from("v_player_comments").select("*").order("created_at", { ascending: false });
  if (matchId) q = q.eq("match_id", matchId);
  if (playerId) q = q.eq("player_id", playerId);
  return unwrap(await q);
}

export async function getPlayerSeasons(playerId) {
  if (DEMO) return demo.v_standings.filter((r) => r.player_id === playerId && r.played > 0);
  return unwrap(await sb.from("v_standings").select("*").eq("player_id", playerId).gt("played", 0));
}

export async function getPlayerMatches(playerId) {
  const mps = DEMO ? demo.match_players.filter((mp) => mp.player_id === playerId)
                   : unwrap(await sb.from("match_players").select("match_id,team").eq("player_id", playerId));
  const ids = mps.map((m) => m.match_id);
  const matches = DEMO ? demo.v_matches.filter((m) => ids.includes(m.id))
                       : (ids.length ? unwrap(await sb.from("v_matches").select("*").in("id", ids)) : []);
  const teamOf = Object.fromEntries(mps.map((m) => [m.match_id, m.team]));
  return matches.map((m) => ({ ...m, team: teamOf[m.id] })).sort((a, b) => b.played_on.localeCompare(a.played_on));
}

// caratteristiche tecniche (radar 0–5); null se il giocatore non è ancora stato valutato
export async function getSkills(playerId) {
  if (DEMO) return null;
  const rows = unwrap(await sb.from("player_skills").select("*").eq("player_id", playerId));
  return rows[0] || null;
}
export async function saveSkills(playerId, v) {
  unwrap(await sb.from("player_skills").upsert({ player_id: playerId, ...v }, { onConflict: "player_id" }));
}

// media voti ricevuti partita per partita (anonima) + flag MVP
export async function getPlayerMatchRatings(playerId) {
  if (DEMO) return demo.v_match_ratings.filter((r) => r.player_id === playerId);
  return unwrap(await sb.from("v_match_ratings").select("*").eq("player_id", playerId));
}

export async function getHallOfFame() {
  if (DEMO) return [...demo.hall_of_fame].sort((a, b) => b.sort_order - a.sort_order);
  return unwrap(await sb.from("hall_of_fame").select("*").order("sort_order", { ascending: false }));
}

// ------------------------------------------------------------------ scritture (soggette a RLS)
export async function saveMatch({ id, seasonId, playedOn, result, bianca, nera, notes, scoreBianca = null, scoreNera = null }) {
  const args = {
    p_season_id: seasonId, p_played_on: playedOn, p_result: result || null,
    p_bianca: bianca, p_nera: nera, p_notes: notes || null, p_match_id: id || null,
  };
  // il punteggio è facoltativo: lo si invia solo se c'è (o se la partita lo aveva già),
  // così il salvataggio funziona anche prima di aver eseguito 0003_match_score.sql
  if (scoreBianca !== null || scoreNera !== null) Object.assign(args, { p_score_bianca: scoreBianca, p_score_nera: scoreNera });
  const res = await sb.rpc("save_match", args);
  if (res.error && "p_score_bianca" in args && /save_match|schema cache|function/i.test(res.error.message))
    throw new Error("Per salvare il punteggio va prima eseguito supabase/migrations/0003_match_score.sql nel SQL Editor di Supabase.");
  return unwrap(res);
}
export async function deleteMatch(id) { unwrap(await sb.from("matches").delete().eq("id", id)); }

export async function addMom({ seasonId, playerId, matchId, awardedOn, note }) {
  unwrap(await sb.from("mom_awards").insert({ season_id: seasonId, player_id: playerId, match_id: matchId || null, awarded_on: awardedOn, note: note || null }));
}
export async function deleteMom(id) { unwrap(await sb.from("mom_awards").delete().eq("id", id)); }

export async function getMyRatings(matchId) {
  return unwrap(await sb.from("player_ratings").select("*").eq("match_id", matchId));
}
export async function upsertRatings(rows) {
  unwrap(await sb.from("player_ratings").upsert(rows, { onConflict: "match_id,rater_id,rated_id" }));
}
export async function deleteRating(id) { unwrap(await sb.from("player_ratings").delete().eq("id", id)); }

// ------------------------------------------------------------------ admin
export async function upsertPlayer(p) { unwrap(await sb.from("players").upsert(p)); }
export async function upsertSeason(s) { unwrap(await sb.from("seasons").upsert(s)); }
export async function setCurrentSeason(id) {
  unwrap(await sb.from("seasons").update({ is_current: false }).eq("is_current", true));
  unwrap(await sb.from("seasons").update({ is_current: true }).eq("id", id));
}
export async function getProfiles() { return unwrap(await sb.from("profiles").select("*").order("created_at", { ascending: false })); }
export async function approveRegistration(id, role) { return unwrap(await sb.rpc("approve_registration", { p_user: id, p_role: role })); }
export async function rejectRegistration(id) { unwrap(await sb.rpc("reject_registration", { p_user: id })); }
export async function deleteUser(id) { unwrap(await sb.rpc("delete_user", { p_user: id })); }
export async function updateProfile(id, patch) { unwrap(await sb.from("profiles").update(patch).eq("id", id)); }
export async function saveSetting(key, value) { unwrap(await sb.from("settings").upsert({ key, value })); }
export async function upsertHallOfFame(row) { unwrap(await sb.from("hall_of_fame").upsert(row)); }
export async function deleteHallOfFame(id) { unwrap(await sb.from("hall_of_fame").delete().eq("id", id)); }
