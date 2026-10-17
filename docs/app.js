import * as api from "./api.js";
import { DEMO } from "./api.js";

// ============================================================== stato & utilità
const S = {
  user: null, me: null,            // utente auth e profilo (ruolo, giocatore)
  seasons: [], season: null,       // stagioni e stagione selezionata
  players: [], pmap: new Map(),    // anagrafica
  settings: {},
};
const $ = (sel, el = document) => el.querySelector(sel);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDate = (d) => new Date(d + "T00:00:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const fmtShort = (d) => new Date(d + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" });
const nick = (id) => S.pmap.get(id)?.nickname || "?";
const initials = (n) => n.slice(0, 2).toUpperCase();
const avatar = (n, cls = "") => `<span class="avatar ${cls}">${esc(initials(n))}</span>`;
const isAdmin = () => S.me?.role === "admin";
const canScore = () => ["admin", "scorekeeper"].includes(S.me?.role);
const myPlayer = () => S.me?.player_id || null;
const today = () => new Date().toISOString().slice(0, 10);

function toast(msg, err = false) {
  const t = document.createElement("div");
  t.className = "toast" + (err ? " err" : ""); t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), err ? 5000 : 2500);
}
async function guard(fn) { try { await fn(); } catch (e) { console.error(e); toast(e.message || "Errore", true); } }

const ICONS = {
  trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/></svg>',
  disc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M17 11a4 4 0 1 0-2-7.5M22 21a7 7 0 0 0-6-6.9"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18l-5.9 3 1.2-6.5L2.5 9.9 9.1 9z"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
};
const NAV = [
  ["#/", "Classifica", "trophy"], ["#/partite", "Partite", "disc"], ["#/giocatori", "Giocatori", "users"],
  ["#/albo", "Albo d'oro", "star"], ["#/regolamento", "Regolamento", "book"],
];

// ============================================================== bootstrap
async function boot() {
  await api.init();
  [S.seasons, S.players, S.settings] = await Promise.all([api.getSeasons(), api.getPlayers(), api.getSettings()]);
  S.pmap = new Map(S.players.map((p) => [p.id, p]));
  S.season = S.seasons.find((s) => s.is_current) || S.seasons[0];
  if (DEMO) { // in demo mostra la stagione con i dati importati
    const ms = await api.getMatches(S.season.id);
    if (!ms.length) { for (const s of S.seasons) { if ((await api.getMatches(s.id)).length) { S.season = s; break; } } }
  }
  if (S.settings.club_name) $("#club").textContent = S.settings.club_name;
  if (S.settings.app_title) document.title = S.settings.app_title;
  if (!DEMO) {
    S.user = await api.auth.user();
    if (S.user) S.me = await api.auth.me();
    api.auth.onChange(async (u) => { S.user = u; S.me = u ? await api.auth.me() : null; renderUserbox(); route(); });
  }
  renderNav(); renderUserbox();
  window.addEventListener("hashchange", route);
  route();
}

function renderNav() {
  const items = NAV.map(([h, l, i]) => `<a href="${h}" data-h="${h}"><span class="ico">${ICONS[i]}</span>${l}</a>`).join("");
  $("#nav-main").innerHTML = NAV.map(([h, l]) => `<a href="${h}" data-h="${h}">${l}</a>`).join("");
  $("#nav-bottom").innerHTML = items + `<a href="#/area" data-h="#/area">${ICONS.lock}Area</a>`;
}
function markNav(hash) {
  const base = "#/" + (hash.split("/")[1] || "");
  const alias = { "#/storico": "#/", "#/partita": "#/partite", "#/giocatore": "#/giocatori", "#/vota": "#/area", "#/tabellino": "#/area", "#/login": "#/area" };
  const act = alias[base] || base;
  document.querySelectorAll("nav a").forEach((a) => a.classList.toggle("active", a.dataset.h === act));
}
function renderUserbox() {
  const box = $("#userbox");
  if (DEMO) { box.innerHTML = `<span class="chip warn">Demo</span>`; return; }
  if (!S.user) { box.innerHTML = `<a class="btn sm" href="#/login">Accedi</a>`; return; }
  const name = S.me?.nickname || S.user.email;
  box.innerHTML = `<a class="btn sm" href="#/area">${avatar(name)}<span>${esc(name)}</span></a>`;
}

// ============================================================== router
const routes = [
  [/^#\/?$/, viewStandings],
  [/^#\/storico(?:\/([\w-]+))?$/, viewHistory],
  [/^#\/partite$/, viewMatches],
  [/^#\/partita\/([\w-]+)$/, viewMatch],
  [/^#\/giocatori$/, viewPlayers],
  [/^#\/giocatore\/([\w-]+)$/, viewPlayer],
  [/^#\/albo$/, viewHallOfFame],
  [/^#\/regolamento$/, viewRules],
  [/^#\/login$/, viewLogin],
  [/^#\/area$/, viewArea],
  [/^#\/tabellino(?:\/([\w-]+))?$/, viewScoreForm],
  [/^#\/vota\/([\w-]+)$/, viewVote],
];
async function route() {
  const hash = location.hash || "#/";
  markNav(hash);
  const app = $("#app");
  for (const [re, fn] of routes) {
    const m = hash.match(re);
    if (m) {
      app.innerHTML = `<div class="empty">Caricamento…</div>`;
      try { app.innerHTML = await fn(...m.slice(1)); app.classList.add("fade"); bindCommon(app); }
      catch (e) { console.error(e); app.innerHTML = `<div class="card"><h2>Ops</h2><p class="muted">${esc(e.message)}</p></div>`; }
      window.scrollTo({ top: 0 });
      return;
    }
  }
  location.hash = "#/";
}
function bindCommon(root) {
  root.querySelectorAll("[data-go]").forEach((el) => el.addEventListener("click", () => (location.hash = el.dataset.go)));
  root.querySelectorAll("select[data-season]").forEach((sel) => sel.addEventListener("change", () => { S.season = S.seasons.find((s) => s.id === sel.value); route(); }));
}
const seasonSelect = () => `<select data-season style="width:auto">${S.seasons.map((s) => `<option value="${s.id}" ${s.id === S.season.id ? "selected" : ""}>Stagione ${esc(s.name)}${s.is_current ? " · in corso" : ""}</option>`).join("")}</select>`;
const demoBanner = () => DEMO ? `<div class="demo-banner">Modalità demo: dati della stagione 2025/2026 importati dall'Excel, solo lettura. Collega Supabase in <code>config.js</code> per attivare login, tabellini e votazioni.</div>` : "";

// ============================================================== CLASSIFICA
const currentSeason = () => S.seasons.find((s) => s.is_current) || S.seasons[0];
const pastSeasons = () => { const cur = currentSeason(); return S.seasons.filter((s) => s.id !== cur?.id); };

async function viewStandings() {
  const s = currentSeason();
  if (!s) return `<div class="empty">Nessuna stagione configurata.</div>`;
  return `${demoBanner()}${standingsHead("current")}${await standingsBody(s, true)}`;
}

async function viewHistory(seasonId) {
  const past = pastSeasons();
  const s = past.find((x) => x.id === seasonId) || past[0];
  if (!s) return `${standingsHead("history")}<div class="empty">Non ci sono ancora stagioni concluse.</div>`;
  return `${demoBanner()}${standingsHead("history")}
    <div class="season-pills">${past.map((x) => `<a class="pill ${x.id === s.id ? "active" : ""}" href="#/storico/${x.id}">${esc(x.name)}</a>`).join("")}</div>
    ${await standingsBody(s, false)}`;
}

function standingsHead(active) {
  const cur = currentSeason();
  return `<div class="page-head"><div class="grow brand-head"><span class="logo" role="img" aria-label="Disc &amp; Disc"></span><div><h3>Classifica</h3><h1>Coppa Impegno Costante</h1></div></div></div>
  <div class="tabs seg" role="tablist">
    <a class="${active === "current" ? "active" : ""}" href="#/"><span class="dot-live"></span>In corso <small>${esc(cur?.name || "")}</small></a>
    <a class="${active === "history" ? "active" : ""}" href="#/storico">Storico</a>
  </div>`;
}

// Corpo classifica di una stagione. Per la stagione in corso mostra tutta la rosa attiva, anche a 0 punti.
async function standingsBody(s, isCurrent) {
  const [rows, ratings] = await Promise.all([api.getStandings(s.id), api.getSeasonRatings(s.id)]);
  const activeIds = new Set(S.players.filter((p) => p.active).map((p) => p.id));
  const shown = rows.filter((r) => r.played > 0 || r.mom > 0 || (isCurrent && activeIds.has(r.player_id)));
  // posizioni ricalcolate sui soli giocatori mostrati (pari punti = pari posizione)
  const byPts = [...shown].sort((a, b) => b.points - a.points || b.wins - a.wins || b.played - a.played || a.nickname.localeCompare(b.nickname, "it"));
  byPts.forEach((r, i) => { const p = byPts[i - 1]; r.pos = p && p.points === r.points && p.wins === r.wins && p.played === r.played ? p.pos : i + 1; });
  const byEff = shown.filter((r) => r.played > 0 && r.eligible_efficiency).sort((a, b) => a.rank_efficiency - b.rank_efficiency);
  const byMvp = ratings.map((r) => ({ ...r, nickname: nick(r.player_id) })).sort((a, b) => b.avg_score - a.avg_score || b.votes - a.votes);
  const me = myPlayer();
  const anyPlayed = shown.some((r) => r.played > 0);

  const podium = (list, key, suffix) => {
    const top = list.slice(0, 3);
    if (top.length < 3 || !top.every((r) => Number(r[key]) > 0)) return "";
    const medal = ["🥇", "🥈", "🥉"];
    return `<div class="podium">${top.map((r, i) => `<div class="step p${i + 1}" data-go="#/giocatore/${r.player_id}">
      <div class="medal">${medal[i]}</div>${avatar(r.nickname)}<div class="name">${esc(r.nickname)}</div>
      <div class="pts">${r[key]}${suffix}</div><div class="sub">${r.played} partite</div></div>`).join("")}</div>`;
  };

  const tablePts = byPts.length ? `<div class="table-wrap"><table class="standings"><thead><tr>
    <th>#</th><th class="name">Giocatore</th><th>G</th><th>V</th><th class="opt">N</th><th class="opt">P</th><th title="Man of the Match / MVP">MoM</th><th class="opt">Eff.</th><th>Punti</th></tr></thead><tbody>
    ${byPts.map((r) => `<tr class="${r.player_id === me ? "me" : ""} ${r.eligible_ranking || r.played === 0 ? "" : "ineligible"} ${r.played === 0 ? "zero" : ""}" data-go="#/giocatore/${r.player_id}" title="${r.eligible_ranking ? "" : `Servono almeno ${s.min_matches_ranking} partite per vincere la coppa`}">
      <td class="rank">${r.played === 0 && r.points === 0 ? "–" : r.pos}</td><td class="name">${esc(r.nickname)}${r.eligible_ranking || r.played === 0 ? "" : ' <span class="chip warn mini">&lt;' + s.min_matches_ranking + ' gg</span>'}</td>
      <td>${r.played}</td><td>${r.wins}</td><td class="opt">${r.draws}</td><td class="opt">${r.losses}</td><td>${r.mom}</td><td class="opt">${Number(r.efficiency).toFixed(0)}%</td><td class="pts">${r.points}</td></tr>`).join("")}
    </tbody></table></div>` : `<div class="empty">Nessun giocatore in classifica.</div>`;

  const tableEff = byEff.length ? `<div class="table-wrap"><table><thead><tr><th>#</th><th class="name">Giocatore</th><th>G</th><th>V</th><th style="text-align:left">Efficienza</th></tr></thead><tbody>
    ${byEff.map((r, i) => `<tr class="${r.player_id === me ? "me" : ""}" data-go="#/giocatore/${r.player_id}"><td class="rank">${i + 1}</td><td class="name">${esc(r.nickname)}</td><td>${r.played}</td><td>${r.wins}</td>
      <td><div class="row" style="flex-wrap:nowrap"><div class="bar" style="flex:1"><i style="width:${r.efficiency}%"></i></div><b>${Number(r.efficiency).toFixed(0)}%</b></div></td></tr>`).join("")}
    </tbody></table></div><p class="small muted">Servono almeno ${s.min_matches_efficiency} partite giocate.</p>` : `<div class="empty">Nessun giocatore ha ancora raggiunto ${s.min_matches_efficiency} partite.</div>`;

  const tableMvp = byMvp.length ? `<div class="table-wrap"><table><thead><tr><th>#</th><th class="name">Giocatore</th><th>Media</th><th>Voti</th><th class="opt">Partite votate</th><th>MVP</th></tr></thead><tbody>
    ${byMvp.map((r, i) => `<tr class="${r.player_id === me ? "me" : ""}" data-go="#/giocatore/${r.player_id}"><td class="rank">${i + 1}</td><td class="name">${esc(r.nickname)}</td><td class="pts">${Number(r.avg_score).toFixed(2)}</td><td>${r.votes}</td><td class="opt">${r.rated_matches}</td><td>${r.mvp_count ? "⭐ " + r.mvp_count : "–"}</td></tr>`).join("")}
    </tbody></table></div>` : `<div class="empty">Ancora nessuna votazione in questa stagione. Dopo ogni partita i giocatori in campo votano i compagni: chi ha la media più alta è l'MVP.</div>`;

  setTimeout(() => {
    const root = $("#app");
    root.querySelectorAll("#tabs button").forEach((b) => b.onclick = () => {
      root.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("active", x === b));
      root.querySelectorAll("[data-tab]").forEach((sec) => sec.classList.toggle("hidden", sec.dataset.tab !== b.dataset.t));
    });
  });
  return `<div class="tabs sub" id="tabs"><button class="active" data-t="pts">🏆 Impegno</button><button data-t="eff">⚡ Efficienza</button><button data-t="mvp">⭐ MVP</button></div>
  <section data-tab="pts">${podium(byPts.filter((r) => r.eligible_ranking), "points", " pt")}${isCurrent && !anyPlayed ? '<p class="small muted">Nessuna partita ancora giocata: tutti partono da 0.</p>' : ""}${tablePts}
    <p class="small muted">G = giocate · V/N/P = vinte/pareggiate/perse · ${s.points_win} punti a vittoria, ${s.points_draw} a pareggio, ${s.points_mom} per MoM/MVP${s.min_players_valid > 0 ? ` · valgono le partite con almeno ${s.min_players_valid} giocatori` : ""}.</p></section>
  <section data-tab="eff" class="hidden">${podium(byEff, "efficiency", "%")}${tableEff}</section>
  <section data-tab="mvp" class="hidden">${podium(byMvp, "avg_score", "")}${tableMvp}</section>`;
}

// ============================================================== PARTITE
function resultChip(m) {
  if (!m.result) return `<span class="chip warn">Risultato da inserire</span>`;
  if (m.result === "pareggio") return `<span class="chip info">Pareggio</span>`;
  return `<span class="chip ok">Vince ${m.result === "bianca" ? "Bianca" : "Nera"}</span>`;
}
const hasScore = (m) => m.score_bianca != null && m.score_nera != null;
async function viewMatches() {
  if (!S.season) return `<div class="empty">Nessuna stagione.</div>`;
  const [matches, moms] = await Promise.all([api.getMatches(S.season.id), api.getMomPoints(S.season.id)]);
  const momBy = {};
  moms.forEach((m) => { if (m.match_id) (momBy[m.match_id] ||= []).push(m); });
  const cards = matches.map((m) => `<div class="card match-card" data-go="#/partita/${m.id}">
      <div class="team ${m.result === "bianca" || m.result === "pareggio" ? "win" : ""}"><div class="tname">Bianca</div><div class="count">${hasScore(m) ? m.score_bianca : m.n_bianca}</div>${hasScore(m) ? `<div class="small muted">${m.n_bianca} gioc.</div>` : ""}</div>
      <div class="mid"><div class="date">${fmtDate(m.played_on)}</div><div class="small muted">${m.n_players} giocatori</div></div>
      <div class="team ${m.result === "nera" || m.result === "pareggio" ? "win" : ""}"><div class="tname">Nera</div><div class="count">${hasScore(m) ? m.score_nera : m.n_nera}</div>${hasScore(m) ? `<div class="small muted">${m.n_nera} gioc.</div>` : ""}</div>
      <div class="meta">${resultChip(m)}${m.is_valid ? "" : (m.result ? '<span class="chip bad">Non valida</span>' : "")}${m.voting_open ? '<span class="chip info">Voto aperto</span>' : ""}
        ${(momBy[m.id] || []).map((x) => `<span class="chip">${x.source === "mvp" ? "⭐ MVP" : "🏅 MoM"} ${esc(nick(x.player_id))}</span>`).join("")}</div>
    </div>`).join("");
  return `${demoBanner()}<div class="page-head"><div class="grow"><h3>Partite</h3><h1>Tabellini</h1></div>${seasonSelect()}${canScore() ? '<a class="btn primary hide-sm" href="#/tabellino">+ Nuovo tabellino</a>' : ""}</div>${canScore() ? '<a class="fab" href="#/tabellino" aria-label="Nuovo tabellino">+</a>' : ""}
    ${matches.length ? `<div class="grid cols-2">${cards}</div>` : `<div class="empty">Nessuna partita ancora registrata.</div>`}`;
}

async function viewMatch(id) {
  const all = await api.getMatches(S.season.id);
  let m = all.find((x) => x.id === id);
  if (!m) { // forse di un'altra stagione
    for (const s of S.seasons) { const ms = await api.getMatches(s.id); m = ms.find((x) => x.id === id); if (m) { S.season = s; break; } }
    if (!m) return `<div class="empty">Partita non trovata.</div>`;
  }
  const [mps, ratings, comments, moms] = await Promise.all([api.getMatchPlayers([id]), api.getMatchRatings(id), api.getComments({ matchId: id }), api.getMomPoints(m.season_id)]);
  const rt = Object.fromEntries(ratings.map((r) => [r.player_id, r]));
  const momHere = moms.filter((x) => x.match_id === id);
  const me = myPlayer();
  const iPlayed = me && mps.some((p) => p.player_id === me);
  const col = (team) => {
    const list = mps.filter((p) => p.team === team).map((p) => ({ ...p, nickname: nick(p.player_id) })).sort((a, b) => a.nickname.localeCompare(b.nickname, "it"));
    const won = m.result === team || m.result === "pareggio";
    return `<div class="col ${team} ${won ? "win" : ""}"><h3>Squadra ${team}<span>${list.length}</span></h3>
      ${list.map((p) => `<div class="pl" data-go="#/giocatore/${p.player_id}"><span>${avatar(p.nickname)} ${esc(p.nickname)}${rt[p.player_id]?.is_mvp ? ' <span class="mvp-badge">⭐ MVP</span>' : ""}${momHere.some((x) => x.player_id === p.player_id && x.source === "manuale") ? ' <span title="Man of the Match">🏅</span>' : ""}</span>
        ${rt[p.player_id] ? `<span class="score" title="${rt[p.player_id].votes} voti">${Number(rt[p.player_id].avg_score).toFixed(1)}</span>` : ""}</div>`).join("") || '<div class="muted small">Nessuno</div>'}</div>`;
  };
  return `<div class="page-head"><div class="grow"><h3>Partita</h3><h1>${fmtDate(m.played_on)}</h1>${hasScore(m) ? `<div class="scoreline"><span>Bianca</span><b>${m.score_bianca} – ${m.score_nera}</b><span>Nera</span></div>` : ""}<div class="row">${resultChip(m)}${m.is_valid ? '<span class="chip ok">Valida</span>' : '<span class="chip bad">Non valida (' + m.n_players + ' giocatori)</span>'}${m.voting_open ? '<span class="chip info">Votazioni aperte</span>' : ""}</div></div>
      <div class="row">${iPlayed && m.voting_open && !DEMO ? `<a class="btn primary" href="#/vota/${m.id}">⭐ Vota i compagni</a>` : ""}${canScore() ? `<a class="btn" href="#/tabellino/${m.id}">Modifica</a>` : ""}</div></div>
    <div class="roster">${col("bianca")}${col("nera")}</div>
    ${m.notes ? `<p class="muted">${esc(m.notes)}</p>` : ""}
    <div class="grid cols-2" style="margin-top:1rem">
      <div class="card"><h2>Valutazioni</h2>${ratings.length ? `<p class="small muted">${ratings.reduce((a, r) => a + r.votes, 0)} voti espressi. L'MVP è chi ha la media più alta con almeno ${S.season.min_votes_mvp} voti${momHere.filter((x) => x.source === "mvp").length ? ": <b>" + momHere.filter((x) => x.source === "mvp").map((x) => esc(nick(x.player_id))).join(", ") + "</b>" : ""}.</p>
        ${[...ratings].sort((a, b) => b.avg_score - a.avg_score).map((r) => `<div class="row" style="justify-content:space-between;padding:.3rem 0;border-bottom:1px solid var(--line)"><span>${r.is_mvp ? "⭐ " : ""}${esc(nick(r.player_id))}</span><span class="row" style="flex:0 0 55%"><div class="bar" style="flex:1"><i style="width:${r.avg_score * 10}%"></i></div><b>${Number(r.avg_score).toFixed(2)}</b><span class="small muted">(${r.votes})</span></span></div>`).join("")}`
        : `<p class="muted">Ancora nessun voto${m.voting_open ? ": chi ha giocato può votare fino a " + S.season.voting_days + " giorni dopo la partita" : ""}.</p>`}</div>
      <div class="card"><h2>Commenti</h2>${comments.length ? comments.map((c) => `<div class="comment"><div class="who">a ${esc(nick(c.player_id))} · voto ${c.score}</div>${esc(c.comment)}</div>`).join("") : '<p class="muted">Nessun commento.</p>'}</div>
    </div>`;
}

// ============================================================== GIOCATORI
async function viewPlayers() {
  const rows = S.season ? await api.getStandings(S.season.id) : [];
  const st = Object.fromEntries(rows.map((r) => [r.player_id, r]));
  const list = S.players.filter((p) => p.active).sort((a, b) => (st[b.id]?.points || 0) - (st[a.id]?.points || 0) || a.nickname.localeCompare(b.nickname, "it"));
  return `${demoBanner()}<div class="page-head"><div class="grow"><h3>Rosa</h3><h1>Giocatori</h1></div>${S.season ? seasonSelect() : ""}</div>
    <div class="player-grid">${list.map((p) => { const r = st[p.id]; return `<div class="card player-card" data-go="#/giocatore/${p.id}">${avatar(p.nickname, "lg")}<div class="nick">${esc(p.nickname)}</div>
      <div class="small muted">${r?.played ? `${r.points} pt · ${r.played} gg · ${Number(r.efficiency).toFixed(0)}%` : "Non ha ancora giocato"}</div></div>`; }).join("")}</div>`;
}

async function viewPlayer(id) {
  const p = S.pmap.get(id);
  if (!p) return `<div class="empty">Giocatore non trovato.</div>`;
  const [seasons, matches, comments] = await Promise.all([api.getPlayerSeasons(id), api.getPlayerMatches(id), api.getComments({ playerId: id })]);
  const ratingsBySeason = {};
  for (const s of S.seasons) ratingsBySeason[s.id] = (await api.getSeasonRatings(s.id)).find((r) => r.player_id === id);
  const cur = seasons.find((s) => s.season_id === S.season?.id) || seasons[0];
  const tl = matches.filter((m) => m.season_id === (cur?.season_id)).sort((a, b) => a.played_on.localeCompare(b.played_on))
    .map((m) => `<i class="${!m.result || !m.is_valid ? "" : m.result === "pareggio" ? "n" : m.result === m.team ? "v" : "p"}" title="${fmtShort(m.played_on)}: ${m.result ? (m.result === "pareggio" ? "pareggio" : m.result === m.team ? "vittoria" : "sconfitta") : "da registrare"}${m.is_valid ? "" : " (non valida)"}"></i>`).join("");
  const rr = cur ? ratingsBySeason[cur.season_id] : null;
  return `<div class="page-head"><div class="grow row">${avatar(p.nickname, "lg")}<div><h3>Giocatore</h3><h1>${esc(p.nickname)}</h1>${p.full_name ? `<div class="muted">${esc(p.full_name)}</div>` : ""}</div></div></div>
    ${cur ? `<div class="card"><h2>Stagione ${esc(cur.season_name)}</h2>
      <div class="stats"><div class="stat"><b>${cur.rank_points}°</b><span>posizione</span></div><div class="stat"><b>${cur.points}</b><span>punti</span></div><div class="stat"><b>${cur.played}</b><span>giocate</span></div>
        <div class="stat"><b>${cur.wins}</b><span>vinte</span></div><div class="stat"><b>${cur.losses}</b><span>perse</span></div><div class="stat"><b>${cur.mom}</b><span>MoM/MVP</span></div>
        <div class="stat"><b>${Number(cur.efficiency).toFixed(0)}%</b><span>efficienza</span></div>${rr ? `<div class="stat"><b>${Number(rr.avg_score).toFixed(2)}</b><span>media voti</span></div>` : ""}</div>
      <h3 style="margin-top:1rem">Andamento</h3><div class="timeline">${tl || '<span class="muted small">Nessuna partita</span>'}</div>
      <div class="legend" style="margin-top:.4rem"><span>🟩 vittoria</span><span>🟨 pareggio</span><span>🟥 sconfitta</span></div></div>` : `<div class="card"><p class="muted">Non ha ancora giocato partite.</p></div>`}
    <div class="grid cols-2" style="margin-top:1rem">
      <div class="card"><h2>Tutte le stagioni</h2><div class="table-wrap" style="box-shadow:none"><table><thead><tr><th class="name">Stagione</th><th>#</th><th>G</th><th>V</th><th>P</th><th>MoM</th><th>Pt</th></tr></thead><tbody>
        ${seasons.sort((a, b) => b.season_name.localeCompare(a.season_name)).map((s) => `<tr><td class="name">${esc(s.season_name)}</td><td>${s.rank_points}</td><td>${s.played}</td><td>${s.wins}</td><td>${s.losses}</td><td>${s.mom}</td><td class="pts">${s.points}</td></tr>`).join("") || '<tr><td colspan="7" class="muted">—</td></tr>'}</tbody></table></div></div>
      <div class="card"><h2>Ultime partite</h2>${matches.slice(0, 8).map((m) => `<div class="row" style="justify-content:space-between;padding:.35rem 0;border-bottom:1px solid var(--line)" data-go="#/partita/${m.id}"><span>${fmtDate(m.played_on)} · <span class="muted small">${m.team}</span></span>${resultChip(m)}</div>`).join("") || '<p class="muted">—</p>'}</div>
    </div>
    <div class="card" style="margin-top:1rem"><h2>Commenti ricevuti</h2>${comments.length ? comments.map((c) => `<div class="comment"><div class="who">voto ${c.score} · ${new Date(c.created_at).toLocaleDateString("it-IT")}</div>${esc(c.comment)}</div>`).join("") : '<p class="muted">Nessun commento ancora. I commenti sono anonimi.</p>'}</div>`;
}

// ============================================================== ALBO D'ORO & REGOLAMENTO
async function viewHallOfFame() {
  const rows = await api.getHallOfFame();
  return `${demoBanner()}<div class="page-head"><div class="grow"><h3>Storia</h3><h1>Albo d'oro</h1></div></div>
    <div class="hof">${rows.map((r) => `<div class="card item"><div><div class="year">${esc(r.season_label)}</div><div class="small muted">${esc(r.period_label || "")}</div></div>
      <div class="grid cols-2"><div><h3>🏆 Impegno Costante</h3><div class="winner">${esc(r.impegno_winner || "–")}</div><div class="small muted">${esc(r.impegno_detail || "")}</div></div>
      <div><h3>⚡ Efficienza</h3><div class="winner">${esc(r.efficienza_winner || "–")}</div><div class="small muted">${esc(r.efficienza_detail || "")}</div></div></div></div>`).join("") || '<div class="empty">Vuoto.</div>'}</div>`;
}
async function viewRules() {
  const s = S.season;
  return `<div class="page-head"><div class="grow"><h3>Regole</h3><h1>Regolamento</h1></div></div>
    <div class="card"><div class="regola">${esc(S.settings.regolamento || "Regolamento non ancora inserito.")}</div></div>
    ${s ? `<div class="card" style="margin-top:1rem"><h2>Parametri stagione ${esc(s.name)}</h2><div class="stats">
      <div class="stat"><b>${s.points_win}</b><span>pt vittoria</span></div><div class="stat"><b>${s.points_draw}</b><span>pt pareggio</span></div><div class="stat"><b>${s.points_mom}</b><span>pt MVP</span></div>
      <div class="stat"><b>${s.min_players_valid}</b><span>min giocatori</span></div><div class="stat"><b>${s.min_matches_ranking}</b><span>gg per la coppa</span></div><div class="stat"><b>${s.min_matches_efficiency}</b><span>gg efficienza</span></div>
      <div class="stat"><b>${s.voting_days}</b><span>giorni di voto</span></div><div class="stat"><b>${s.min_votes_mvp}</b><span>voti min. MVP</span></div></div></div>` : ""}`;
}

// ============================================================== LOGIN
async function viewLogin() {
  if (DEMO) return `<div class="card login-box"><span class="logo" role="img" aria-label="Disc &amp; Disc"></span><h2>Modalità demo</h2><p class="muted">Il login si attiva collegando un progetto Supabase in <code>config.js</code>.</p></div>`;
  if (S.user) { location.hash = "#/area"; return ""; }
  setTimeout(() => {
    const f = $("#login-form");
    f.onsubmit = (e) => { e.preventDefault(); guard(async () => { await api.auth.signIn(f.email.value.trim(), f.password.value); toast("Bentornato!"); location.hash = "#/area"; }); };
    $("#btn-signup").onclick = () => guard(async () => {
      if (!f.email.value || f.password.value.length < 6) throw new Error("Inserisci email e una password di almeno 6 caratteri");
      await api.auth.signUp(f.email.value.trim(), f.password.value); toast("Registrazione inviata: controlla l'email per confermare (se richiesto), poi accedi.");
    });
    $("#btn-magic").onclick = () => guard(async () => { if (!f.email.value) throw new Error("Inserisci l'email"); await api.auth.magicLink(f.email.value.trim()); toast("Ti ho inviato un link di accesso via email."); });
  });
  return `<div class="card login-box"><span class="logo" role="img" aria-label="Disc &amp; Disc"></span><h2>Accedi</h2><p class="small muted">Usa l'email che hai comunicato all'organizzatore: verrai collegato automaticamente al tuo giocatore.</p>
    <form id="login-form"><label>Email</label><input type="email" name="email" required autocomplete="email" /><label>Password</label><input type="password" name="password" autocomplete="current-password" />
      <div class="row" style="margin-top:1rem"><button class="btn primary" type="submit">Accedi</button><button class="btn" type="button" id="btn-signup">Registrati</button><button class="btn" type="button" id="btn-magic">Link via email</button></div></form></div>`;
}

// ============================================================== AREA RISERVATA
async function viewArea() {
  if (DEMO) return viewLogin();
  if (!S.user) { location.hash = "#/login"; return ""; }
  const me = S.me;
  const roleLabel = { admin: "Organizzatore", scorekeeper: "Score keeper", player: "Giocatore" }[me?.role] || "–";
  // partite votabili per il giocatore
  let votable = [];
  if (myPlayer() && S.season) {
    const ms = await api.getMatches(S.season.id);
    const open = ms.filter((m) => m.voting_open);
    if (open.length) {
      const mps = await api.getMatchPlayers(open.map((m) => m.id));
      votable = open.filter((m) => mps.some((p) => p.match_id === m.id && p.player_id === myPlayer()));
    }
  }
  setTimeout(() => {
    $("#btn-logout").onclick = () => guard(async () => { await api.auth.signOut(); location.hash = "#/"; });
    if (!isAdmin() && canScore()) renderMomAdmin();
    const tabs = $("#area-tabs");
    if (tabs) tabs.querySelectorAll("button").forEach((b) => b.onclick = () => {
      tabs.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
      document.querySelectorAll("[data-atab]").forEach((sec) => sec.classList.toggle("hidden", sec.dataset.atab !== b.dataset.t));
      if (b.dataset.t === "players") renderAdminPlayers(); if (b.dataset.t === "users") renderAdminUsers(); if (b.dataset.t === "seasons") renderAdminSeasons(); if (b.dataset.t === "texts") renderAdminTexts();
      if (b.dataset.t === "mom") renderMomAdmin();
    });
  });
  return `<div class="page-head"><div class="grow row">${avatar(me?.nickname || S.user.email, "lg")}<div><h3>${roleLabel}</h3><h1>${esc(me?.nickname || S.user.email)}</h1><div class="small muted">${esc(S.user.email)}</div></div></div><button class="btn" id="btn-logout">Esci</button></div>
    ${!me?.player_id ? `<div class="card" style="margin-bottom:1rem"><h2>Account non collegato a un giocatore</h2><p class="muted">Chiedi all'organizzatore di associare la tua email (${esc(S.user.email)}) al tuo nickname: potrai votare i compagni dopo le partite.</p></div>` : ""}
    <div class="grid cols-2">
      ${me?.player_id ? `<div class="card"><h2>⭐ Vota i compagni</h2>${votable.length ? votable.map((m) => `<div class="row" style="justify-content:space-between;padding:.4rem 0;border-bottom:1px solid var(--line)"><span>${fmtDate(m.played_on)} <span class="small muted">${m.n_players} giocatori</span></span><a class="btn sm primary" href="#/vota/${m.id}">Vota</a></div>`).join("") : `<p class="muted">Nessuna partita con votazioni aperte in cui hai giocato. Le votazioni restano aperte ${S.season?.voting_days ?? 7} giorni dopo la partita.</p>`}</div>` : ""}
      ${canScore() ? `<div class="card"><h2>📋 Tabellini</h2><p class="muted small">Registra la partita del sabato: squadre, vincente e, se serve, MoM assegnati a mano.</p><div class="row"><a class="btn primary" href="#/tabellino">+ Nuovo tabellino</a><a class="btn" href="#/partite">Elenco partite</a></div></div>` : ""}
    </div>
    ${isAdmin() ? `<div style="margin-top:1.5rem"><h2>Amministrazione</h2>
      <div class="tabs" id="area-tabs"><button data-t="none" class="active">—</button><button data-t="players">Giocatori</button><button data-t="users">Utenti e inviti</button><button data-t="seasons">Stagioni</button><button data-t="mom">MoM manuali</button><button data-t="texts">Testi e albo</button></div>
      <div data-atab="players" class="hidden card" style="margin-top:1rem" id="adm-players"></div>
      <div data-atab="users" class="hidden card" style="margin-top:1rem" id="adm-users"></div>
      <div data-atab="seasons" class="hidden card" style="margin-top:1rem" id="adm-seasons"></div>
      <div data-atab="mom" class="hidden card" style="margin-top:1rem" id="adm-mom"></div>
      <div data-atab="texts" class="hidden card" style="margin-top:1rem" id="adm-texts"></div></div>` : (canScore() ? `<div class="card" style="margin-top:1rem" id="adm-mom"></div>` : "")}`;
}

// ---- admin: giocatori
async function renderAdminPlayers() {
  const el = $("#adm-players"); if (!el) return;
  S.players = await api.getPlayers(); S.pmap = new Map(S.players.map((p) => [p.id, p]));
  el.innerHTML = `<h2>Giocatori</h2><form class="row" id="f-new-player"><input type="text" name="nickname" placeholder="Nickname" required style="max-width:200px" /><input type="text" name="full_name" placeholder="Nome e cognome (opz.)" style="max-width:260px" /><button class="btn primary">Aggiungi</button></form>
    <div class="table-wrap" style="margin-top:1rem;box-shadow:none"><table><thead><tr><th class="name">Nickname</th><th class="name">Nome</th><th>Attivo</th><th></th></tr></thead><tbody>
    ${S.players.map((p) => `<tr data-id="${p.id}"><td class="name"><input type="text" value="${esc(p.nickname)}" data-f="nickname" style="min-width:120px" /></td><td class="name"><input type="text" value="${esc(p.full_name || "")}" data-f="full_name" style="min-width:160px" /></td><td><input type="checkbox" ${p.active ? "checked" : ""} data-f="active" /></td><td><button class="btn sm" data-save>Salva</button></td></tr>`).join("")}</tbody></table></div>`;
  $("#f-new-player").onsubmit = (e) => { e.preventDefault(); guard(async () => { await api.upsertPlayer({ nickname: e.target.nickname.value.trim(), full_name: e.target.full_name.value.trim() || null }); toast("Giocatore aggiunto"); renderAdminPlayers(); }); };
  el.querySelectorAll("[data-save]").forEach((b) => b.onclick = () => guard(async () => {
    const tr = b.closest("tr");
    await api.upsertPlayer({ id: tr.dataset.id, nickname: tr.querySelector('[data-f="nickname"]').value.trim(), full_name: tr.querySelector('[data-f="full_name"]').value.trim() || null, active: tr.querySelector('[data-f="active"]').checked });
    toast("Salvato"); renderAdminPlayers();
  }));
}

// ---- admin: utenti e inviti
async function renderAdminUsers() {
  const el = $("#adm-users"); if (!el) return;
  const [invites, profiles] = await Promise.all([api.getInvites(), api.getProfiles()]);
  const roles = ["player", "scorekeeper", "admin"];
  const playerOpts = (sel) => `<option value="">— nessuno —</option>` + S.players.map((p) => `<option value="${p.id}" ${p.id === sel ? "selected" : ""}>${esc(p.nickname)}</option>`).join("");
  const roleOpts = (sel) => roles.map((r) => `<option value="${r}" ${r === sel ? "selected" : ""}>${r}</option>`).join("");
  el.innerHTML = `<h2>Inviti</h2><p class="small muted">Associa un'email a un giocatore e a un ruolo: quando quella persona si registra con la stessa email viene collegata automaticamente.</p>
    <form class="row" id="f-inv"><input type="email" name="email" placeholder="email" required style="max-width:240px" /><select name="player_id" style="max-width:180px">${playerOpts()}</select><select name="role" style="max-width:150px">${roleOpts("player")}</select><button class="btn primary">Aggiungi invito</button></form>
    <div class="table-wrap" style="margin-top:.8rem;box-shadow:none"><table><thead><tr><th class="name">Email</th><th>Giocatore</th><th>Ruolo</th><th></th></tr></thead><tbody>${invites.map((i) => `<tr><td class="name">${esc(i.email)}</td><td>${esc(nick(i.player_id))}</td><td>${i.role}</td><td><button class="btn sm danger" data-del="${esc(i.email)}">Elimina</button></td></tr>`).join("") || '<tr><td colspan="4" class="muted">Nessun invito</td></tr>'}</tbody></table></div>
    <h2 style="margin-top:1.5rem">Utenti registrati</h2>
    <div class="table-wrap" style="box-shadow:none"><table><thead><tr><th class="name">Email</th><th>Giocatore</th><th>Ruolo</th><th></th></tr></thead><tbody>${profiles.map((p) => `<tr data-id="${p.id}"><td class="name">${esc(p.email || "")}</td><td><select data-f="player_id" style="min-width:150px">${playerOpts(p.player_id)}</select></td><td><select data-f="role">${roleOpts(p.role)}</select></td><td><button class="btn sm" data-save>Salva</button></td></tr>`).join("")}</tbody></table></div>`;
  $("#f-inv").onsubmit = (e) => { e.preventDefault(); guard(async () => {
    if (!e.target.player_id.value) throw new Error("Scegli il giocatore");
    await api.upsertInvite({ email: e.target.email.value.trim().toLowerCase(), player_id: e.target.player_id.value, role: e.target.role.value }); toast("Invito salvato"); renderAdminUsers(); }); };
  el.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => guard(async () => { await api.deleteInvite(b.dataset.del); renderAdminUsers(); }));
  el.querySelectorAll("[data-save]").forEach((b) => b.onclick = () => guard(async () => {
    const tr = b.closest("tr");
    await api.updateProfile(tr.dataset.id, { player_id: tr.querySelector('[data-f="player_id"]').value || null, role: tr.querySelector('[data-f="role"]').value }); toast("Salvato"); renderAdminUsers();
  }));
}

// ---- admin: stagioni
async function renderAdminSeasons() {
  const el = $("#adm-seasons"); if (!el) return;
  S.seasons = await api.getSeasons();
  const F = [["name", "Nome", "text"], ["starts_on", "Inizio", "date"], ["ends_on", "Fine", "date"], ["points_win", "Pt vittoria", "number"], ["points_draw", "Pt pareggio", "number"], ["points_mom", "Pt MVP/MoM", "number"],
    ["min_players_valid", "Min giocatori", "number"], ["min_matches_ranking", "Gg per la coppa", "number"], ["min_matches_efficiency", "Gg efficienza", "number"], ["voting_days", "Giorni di voto", "number"], ["min_votes_mvp", "Voti min MVP", "number"]];
  const form = (s = {}) => `<div class="grid cols-3">${F.map(([k, l, t]) => `<div><label>${l}</label><input type="${t}" name="${k}" value="${esc(s[k] ?? "")}" ${t === "number" ? 'min="0"' : ""} /></div>`).join("")}</div>`;
  el.innerHTML = `<h2>Stagioni</h2>${S.seasons.map((s) => `<details class="card flat" style="margin-bottom:.6rem"><summary style="cursor:pointer;font-weight:700">${esc(s.name)} ${s.is_current ? '<span class="chip ok">in corso</span>' : ""}</summary>
      <form data-id="${s.id}">${form(s)}<div class="row" style="margin-top:.8rem"><button class="btn primary">Salva</button>${s.is_current ? "" : `<button type="button" class="btn" data-current="${s.id}">Imposta come stagione in corso</button>`}</div></form></details>`).join("")}
    <details class="card flat"><summary style="cursor:pointer;font-weight:700">+ Nuova stagione</summary><form data-id="">${form({ points_win: 3, points_draw: 1, points_mom: 1, min_players_valid: 12, min_matches_ranking: 4, min_matches_efficiency: 5, voting_days: 7, min_votes_mvp: 3 })}<div class="row" style="margin-top:.8rem"><button class="btn primary">Crea</button></div></form></details>`;
  el.querySelectorAll("form").forEach((f) => f.onsubmit = (e) => { e.preventDefault(); guard(async () => {
    const row = {}; F.forEach(([k, , t]) => row[k] = t === "number" ? Number(f[k].value) : f[k].value);
    if (f.dataset.id) row.id = f.dataset.id;
    await api.upsertSeason(row); toast("Stagione salvata"); S.seasons = await api.getSeasons(); S.season = S.seasons.find((s) => s.id === S.season?.id) || S.seasons[0]; renderAdminSeasons(); }); });
  el.querySelectorAll("[data-current]").forEach((b) => b.onclick = () => guard(async () => { await api.setCurrentSeason(b.dataset.current); S.seasons = await api.getSeasons(); S.season = S.seasons.find((s) => s.is_current); toast("Stagione corrente aggiornata"); renderAdminSeasons(); }));
}

// ---- MoM manuali (admin e score keeper)
async function renderMomAdmin() {
  const el = $("#adm-mom"); if (!el || !S.season) return;
  const [moms, matches] = await Promise.all([api.getMomPoints(S.season.id), api.getMatches(S.season.id)]);
  const manual = moms.filter((m) => m.source === "manuale").sort((a, b) => b.awarded_on.localeCompare(a.awarded_on));
  el.innerHTML = `<h2>Man of the Match manuali · ${esc(S.season.name)}</h2><p class="small muted">Normalmente l'MVP nasce dai voti. Qui puoi assegnare a mano un MoM "aggiuntivo" (vale ${S.season.points_mom} punto).</p>
    <form class="row" id="f-mom"><select name="player_id" style="max-width:180px">${S.players.filter((p) => p.active).map((p) => `<option value="${p.id}">${esc(p.nickname)}</option>`).join("")}</select>
      <select name="match_id" style="max-width:220px"><option value="">— senza partita —</option>${matches.map((m) => `<option value="${m.id}" data-d="${m.played_on}">${fmtDate(m.played_on)}</option>`).join("")}</select>
      <input type="date" name="awarded_on" value="${today()}" style="max-width:170px" /><input type="text" name="note" placeholder="nota (opz.)" style="max-width:200px" /><button class="btn primary">Assegna</button></form>
    <div class="table-wrap" style="margin-top:.8rem;box-shadow:none"><table><thead><tr><th>Data</th><th class="name">Giocatore</th><th class="name">Nota</th><th></th></tr></thead><tbody>${manual.map((m) => `<tr><td>${fmtShort(m.awarded_on)}</td><td class="name">${esc(nick(m.player_id))}</td><td class="name small muted">${esc(m.note || "")}</td><td><button class="btn sm danger" data-del="${m.id}">Elimina</button></td></tr>`).join("") || '<tr><td colspan="4" class="muted">Nessuno</td></tr>'}</tbody></table></div>`;
  const f = $("#f-mom");
  f.match_id.onchange = () => { const d = f.match_id.selectedOptions[0]?.dataset.d; if (d) f.awarded_on.value = d; };
  f.onsubmit = (e) => { e.preventDefault(); guard(async () => { await api.addMom({ seasonId: S.season.id, playerId: f.player_id.value, matchId: f.match_id.value || null, awardedOn: f.awarded_on.value, note: f.note.value }); toast("MoM assegnato"); renderMomAdmin(); }); };
  el.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => guard(async () => { await api.deleteMom(b.dataset.del); renderMomAdmin(); }));
}

// ---- admin: testi e albo d'oro
async function renderAdminTexts() {
  const el = $("#adm-texts"); if (!el) return;
  const hof = await api.getHallOfFame();
  el.innerHTML = `<h2>Testi</h2><label>Titolo</label><input type="text" id="t-title" value="${esc(S.settings.app_title || "")}" /><label>Nome club</label><input type="text" id="t-club" value="${esc(S.settings.club_name || "")}" />
    <label>Regolamento</label><textarea id="t-rules" rows="12">${esc(S.settings.regolamento || "")}</textarea><div class="row" style="margin-top:.6rem"><button class="btn primary" id="t-save">Salva testi</button></div>
    <h2 style="margin-top:1.5rem">Albo d'oro</h2>
    ${hof.map((r) => `<form class="card flat" data-id="${r.id}" style="margin-bottom:.6rem"><div class="grid cols-3"><div><label>Stagione</label><input name="season_label" value="${esc(r.season_label)}" /></div><div><label>Periodo</label><input name="period_label" value="${esc(r.period_label || "")}" /></div><div><label>Ordine</label><input type="number" name="sort_order" value="${r.sort_order}" /></div>
      <div><label>Vincitore Impegno</label><input name="impegno_winner" value="${esc(r.impegno_winner || "")}" /></div><div><label>Dettaglio</label><input name="impegno_detail" value="${esc(r.impegno_detail || "")}" /></div><div></div>
      <div><label>Vincitore Efficienza</label><input name="efficienza_winner" value="${esc(r.efficienza_winner || "")}" /></div><div><label>Dettaglio</label><input name="efficienza_detail" value="${esc(r.efficienza_detail || "")}" /></div></div>
      <div class="row" style="margin-top:.6rem"><button class="btn sm primary">Salva</button><button type="button" class="btn sm danger" data-del="${r.id}">Elimina</button></div></form>`).join("")}
    <form class="card flat" data-id=""><h3>Nuova riga</h3><div class="grid cols-3"><div><label>Stagione</label><input name="season_label" required /></div><div><label>Periodo</label><input name="period_label" /></div><div><label>Ordine</label><input type="number" name="sort_order" value="${hof.length + 1}" /></div>
      <div><label>Vincitore Impegno</label><input name="impegno_winner" /></div><div><label>Dettaglio</label><input name="impegno_detail" /></div><div></div><div><label>Vincitore Efficienza</label><input name="efficienza_winner" /></div><div><label>Dettaglio</label><input name="efficienza_detail" /></div></div>
      <div class="row" style="margin-top:.6rem"><button class="btn sm primary">Aggiungi</button></div></form>`;
  $("#t-save").onclick = () => guard(async () => {
    await api.saveSetting("app_title", $("#t-title").value); await api.saveSetting("club_name", $("#t-club").value); await api.saveSetting("regolamento", $("#t-rules").value);
    S.settings = await api.getSettings(); $("#club").textContent = S.settings.club_name || ""; toast("Testi salvati");
  });
  el.querySelectorAll("form").forEach((f) => f.onsubmit = (e) => { e.preventDefault(); guard(async () => {
    const row = {}; ["season_label", "period_label", "impegno_winner", "impegno_detail", "efficienza_winner", "efficienza_detail"].forEach((k) => row[k] = f[k].value || null); row.sort_order = Number(f.sort_order.value);
    if (f.dataset.id) row.id = f.dataset.id; await api.upsertHallOfFame(row); toast("Albo aggiornato"); renderAdminTexts(); }); });
  el.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => guard(async () => { await api.deleteHallOfFame(b.dataset.del); renderAdminTexts(); }));
}

// ============================================================== TABELLINO (score keeper)
async function viewScoreForm(id) {
  if (!canScore()) { location.hash = "#/login"; return ""; }
  let m = null;
  const assign = {};                       // player_id -> "bianca" | "nera"
  if (id) {
    for (const s of S.seasons) { const ms = await api.getMatches(s.id); m = ms.find((x) => x.id === id); if (m) break; }
    if (!m) return `<div class="empty">Partita non trovata.</div>`;
    (await api.getMatchPlayers([id])).forEach((p) => assign[p.player_id] = p.team);
  }
  const seasonId = m?.season_id || currentSeason()?.id;
  const players = S.players.filter((p) => p.active || assign[p.id]);
  let target = "bianca";                   // squadra a cui si aggiungono i giocatori toccati
  let result = m?.result || "";
  const TEAM = { bianca: "Bianca", nera: "Nera" };

  const minPlayers = () => S.seasons.find((s) => s.id === $("#f-match")?.season_id.value)?.min_players_valid || 0;
  const listOf = (t) => players.filter((p) => assign[p.id] === t).sort((a, b) => a.nickname.localeCompare(b.nickname, "it"));

  const render = () => {
    for (const t of ["bianca", "nera"]) {
      const list = listOf(t);
      $(`#board-${t} .n`).textContent = list.length;
      $(`#board-${t} .list`).innerHTML = list.map((p) => `<button type="button" class="tag" data-rm="${p.id}" aria-label="Togli ${esc(p.nickname)}">${esc(p.nickname)}<span aria-hidden="true">×</span></button>`).join("")
        || `<span class="muted small">Tocca i giocatori qui sotto</span>`;
      $(`#board-${t}`).classList.toggle("target", t === target);
      $(`#seg-${t}`).classList.toggle("active", t === target);
    }
    const q = $("#pool-q").value.trim().toLowerCase();
    const free = players.filter((p) => !assign[p.id] && (!q || p.nickname.toLowerCase().includes(q)));
    $("#pool").innerHTML = free.map((p) => `<button type="button" class="pick" data-add="${p.id}">${esc(p.nickname)}</button>`).join("")
      || `<span class="muted small">${q ? "Nessun giocatore trovato" : "Tutti i giocatori sono in squadra"}</span>`;
    $("#pool-to").textContent = TEAM[target];
    $("#pool-to").className = "chip team-" + target;
    const nb = listOf("bianca").length, nn = listOf("nera").length, min = minPlayers();
    $("#sum").innerHTML = `<b>${nb}</b> vs <b>${nn}</b> · <span class="${nb + nn >= min ? "ok" : "warn"}">${nb + nn}${min ? "/" + min : ""} giocatori</span>`;
    document.querySelectorAll("#res-seg button").forEach((b) => b.classList.toggle("active", b.dataset.r === result));
  };

  // punteggio → risultato automatico (si può sempre cambiare a mano)
  const syncResultFromScore = () => {
    const a = $("#sc-b").value, b = $("#sc-n").value;
    if (a === "" || b === "") return;
    result = +a > +b ? "bianca" : +a < +b ? "nera" : "pareggio";
  };

  setTimeout(() => {
    const f = $("#f-match");
    f.addEventListener("click", (e) => {
      const add = e.target.closest("[data-add]"), rm = e.target.closest("[data-rm]"), seg = e.target.closest("[data-target]"), res = e.target.closest("[data-r]"), step = e.target.closest("[data-step]");
      if (add) { assign[add.dataset.add] = target; if (navigator.vibrate) navigator.vibrate(8); render(); $("#pool-q").value && ($("#pool-q").value = "", render()); }
      else if (rm) { delete assign[rm.dataset.rm]; render(); }
      else if (seg) { target = seg.dataset.target; render(); }
      else if (res) { result = res.dataset.r; render(); }
      else if (step) { const inp = $("#" + step.dataset.for); inp.value = Math.max(0, (+inp.value || 0) + +step.dataset.step); syncResultFromScore(); render(); }
    });
    $("#pool-q").oninput = render;
    f.season_id.onchange = render;
    ["#sc-b", "#sc-n"].forEach((s) => $(s).oninput = () => { syncResultFromScore(); render(); });
    render();
    f.onsubmit = (e) => { e.preventDefault(); guard(async () => {
      const bianca = listOf("bianca").map((p) => p.id), nera = listOf("nera").map((p) => p.id);
      if (!bianca.length || !nera.length) throw new Error("Servono giocatori in entrambe le squadre");
      const sb = $("#sc-b").value, sn = $("#sc-n").value;
      if ((sb === "") !== (sn === "")) throw new Error("Inserisci il punteggio di entrambe le squadre (o lasciali vuoti)");
      const btn = $("#btn-save"); btn.disabled = true;
      try {
        const newId = await api.saveMatch({ id: m?.id, seasonId: f.season_id.value, playedOn: f.played_on.value, result: result || null, bianca, nera, notes: f.notes.value,
          scoreBianca: sb === "" ? null : +sb, scoreNera: sn === "" ? null : +sn });
        toast("Tabellino salvato"); location.hash = "#/partita/" + newId;
      } finally { btn.disabled = false; }
    }); };
    const del = $("#btn-del"); if (del) del.onclick = () => { if (confirm("Eliminare definitivamente questa partita (e i voti collegati)?")) guard(async () => { await api.deleteMatch(m.id); toast("Partita eliminata"); location.hash = "#/partite"; }); };
  });

  const scoreBox = (t, v) => `<div class="score-in team-${t}"><span class="lbl">${TEAM[t]}</span>
      <div class="stepper"><button type="button" data-step="-1" data-for="sc-${t[0]}" aria-label="meno">−</button><input id="sc-${t[0]}" type="number" inputmode="numeric" min="0" max="99" placeholder="–" value="${v ?? ""}" /><button type="button" data-step="1" data-for="sc-${t[0]}" aria-label="più">+</button></div></div>`;

  return `<div class="page-head"><div class="grow"><h3>Tabellino</h3><h1>${m ? "Modifica partita" : "Nuova partita"}</h1></div></div>
  <form id="f-match" class="score-form">
    <div class="card">
      <div class="grid cols-2 tight">
        <div><label>Stagione</label><select name="season_id">${S.seasons.map((s) => `<option value="${s.id}" ${s.id === seasonId ? "selected" : ""}>${esc(s.name)}${s.is_current ? " · in corso" : ""}</option>`).join("")}</select></div>
        <div><label>Data</label><input type="date" name="played_on" value="${m?.played_on || today()}" required /></div>
      </div>
      <label>Risultato</label>
      <div class="seg3" id="res-seg"><button type="button" data-r="bianca">Vince Bianca</button><button type="button" data-r="pareggio">Pareggio</button><button type="button" data-r="nera">Vince Nera</button></div>
      <button type="button" class="linklike small" data-r="">Risultato da definire</button>
      <label>Punteggio <span class="muted">(facoltativo)</span></label>
      <div class="score-row">${scoreBox("bianca", m?.score_bianca)}<span class="vs">–</span>${scoreBox("nera", m?.score_nera)}</div>
    </div>

    <div class="team-switch" role="radiogroup" aria-label="Squadra a cui aggiungere">
      <span class="small muted">Aggiungi a</span>
      <button type="button" id="seg-bianca" data-target="bianca" class="team-bianca">⚪ Bianca</button>
      <button type="button" id="seg-nera" data-target="nera" class="team-nera">⚫ Nera</button>
    </div>

    <div class="boards">
      <div class="board bianca" id="board-bianca" data-target="bianca"><h4>Squadra Bianca <span class="n">0</span></h4><div class="list"></div></div>
      <div class="board nera" id="board-nera" data-target="nera"><h4>Squadra Nera <span class="n">0</span></h4><div class="list"></div></div>
    </div>

    <div class="card">
      <div class="row" style="justify-content:space-between"><h2 style="margin:0">Giocatori</h2><span class="small muted">tocca per aggiungere a <span id="pool-to" class="chip"></span></span></div>
      <input type="search" id="pool-q" placeholder="Cerca…" autocomplete="off" style="margin:.6rem 0" />
      <div class="pick-grid" id="pool"></div>
      <label>Note</label><input type="text" name="notes" value="${esc(m?.notes || "")}" placeholder="opzionale" />
      ${m && isAdmin() ? '<div class="row" style="margin-top:1rem"><button type="button" class="btn danger" id="btn-del">Elimina partita</button></div>' : ""}
    </div>

    <div class="savebar"><div id="sum" class="small"></div><a class="btn" href="${m ? "#/partita/" + m.id : "#/partite"}">Annulla</a><button class="btn primary" type="submit" id="btn-save">Salva</button></div>
  </form>`;
}

// ============================================================== VOTA
async function viewVote(matchId) {
  if (!myPlayer()) { location.hash = "#/area"; return ""; }
  let m = null;
  for (const s of S.seasons) { const ms = await api.getMatches(s.id); m = ms.find((x) => x.id === matchId); if (m) break; }
  if (!m) return `<div class="empty">Partita non trovata.</div>`;
  const [mps, mine] = await Promise.all([api.getMatchPlayers([matchId]), api.getMyRatings(matchId)]);
  const me = myPlayer();
  if (!mps.some((p) => p.player_id === me)) return `<div class="card"><h2>Non hai giocato questa partita</h2><p class="muted">Puoi votare solo le partite in cui sei stato in campo.</p></div>`;
  if (!m.voting_open) return `<div class="card"><h2>Votazioni chiuse</h2><p class="muted">Si può votare fino a ${S.seasons.find((s) => s.id === m.season_id)?.voting_days} giorni dopo la partita.</p></div>`;
  const myTeam = mps.find((p) => p.player_id === me).team;
  const prev = Object.fromEntries(mine.map((r) => [r.rated_id, r]));
  const others = mps.filter((p) => p.player_id !== me).map((p) => ({ ...p, nickname: nick(p.player_id) })).sort((a, b) => (a.team === myTeam ? 0 : 1) - (b.team === myTeam ? 0 : 1) || a.nickname.localeCompare(b.nickname, "it"));
  setTimeout(() => {
    document.querySelectorAll(".vote-row input[type=range]").forEach((r) => r.oninput = () => { r.closest(".vote-row").querySelector(".val").textContent = r.value; r.closest(".vote-row").classList.add("touched"); });
    document.querySelectorAll(".vote-row").forEach((row) => row.querySelector(".skip").onclick = () => { row.classList.toggle("skipped"); row.querySelector(".skip").textContent = row.classList.contains("skipped") ? "Includi" : "Salta"; });
    $("#f-vote").onsubmit = (e) => { e.preventDefault(); guard(async () => {
      const rows = [];
      document.querySelectorAll(".vote-row").forEach((row) => {
        if (row.classList.contains("skipped")) return;
        rows.push({ match_id: matchId, rater_id: me, rated_id: row.dataset.id, score: Number(row.querySelector("input[type=range]").value), comment: row.querySelector("textarea").value.trim() || null });
      });
      if (!rows.length) throw new Error("Nessun voto da salvare");
      await api.upsertRatings(rows); toast(`Salvati ${rows.length} voti. Grazie!`); location.hash = "#/partita/" + matchId; }); };
  });
  return `<div class="page-head"><div class="grow"><h3>Vota i compagni</h3><h1>${fmtDate(m.played_on)}</h1><p class="muted small">Da 1 a 10, con un commento facoltativo. I voti sono anonimi: gli altri vedono solo la media. Puoi tornare a modificarli finché le votazioni sono aperte. Usa "Salta" per chi non vuoi valutare.</p></div></div>
    <form id="f-vote" class="card">${others.map((p) => { const r = prev[p.player_id]; return `<div class="vote-row" data-id="${p.player_id}"><span class="nick">${avatar(p.nickname)} ${esc(p.nickname)} <span class="chip" style="font-size:.65rem">${p.team}</span></span>
      <input type="range" min="1" max="10" step="1" value="${r?.score ?? 6}" /><span class="val">${r?.score ?? 6}</span>
      <textarea placeholder="Commento (facoltativo)" maxlength="300">${esc(r?.comment || "")}</textarea><button type="button" class="btn sm skip">Salta</button></div>`; }).join("")}
      <div class="row" style="margin-top:1rem"><button class="btn primary" type="submit">Salva i voti</button><a class="btn" href="#/partita/${matchId}">Annulla</a></div></form>
    <style>.vote-row.skipped { opacity: .4 } .vote-row .skip { grid-column: 1 / -1; justify-self: end }</style>`;
}

boot().catch((e) => { console.error(e); $("#app").innerHTML = `<div class="card"><h2>Errore di avvio</h2><p class="muted">${esc(e.message)}</p></div>`; });
