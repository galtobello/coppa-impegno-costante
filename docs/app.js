import * as api from "./api.js?v=202610261211";
import { DEMO } from "./api.js?v=202610261211";
import { makeTeams, teamStats } from "./squadre.js?v=202610261211";

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
const canScore = () => ["admin", "scorekeeper", "coach"].includes(S.me?.role);
const ROLE_LABEL = { admin: "Organizzatore", coach: "Allenatore", scorekeeper: "Score keeper", player: "Giocatore" };
// ultimo giorno utile per votare (si vota per voting_days giorni a partire dal giorno della partita)
// calcolo in UTC su date pure: niente slittamenti di fuso (in Italia la mezzanotte locale in UTC è ancora il giorno prima)
const lastVoteDay = (m) => { const d = new Date(m.played_on + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + (S.seasons.find((s) => s.id === m.season_id)?.voting_days ?? 7) - 1); return d.toISOString().slice(0, 10); };
const myPlayer = () => S.me?.player_id || null;
// data di oggi in ora italiana (come il database), formato AAAA-MM-GG
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });

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
  renderNav(); renderUserbox(); bindCommentDelete();
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
  const alias = { "#/storico": "#/", "#/partita": "#/partite", "#/giocatore": "#/giocatori", "#/vota": "#/area", "#/tabellino": "#/area", "#/squadre": "#/partite", "#/login": "#/area", "#/registrati": "#/area" };
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
  [/^#\/(login|registrati)$/, viewLogin],
  [/^#\/area$/, viewArea],
  [/^#\/tabellino(?:\/([\w-]+))?$/, viewScoreForm],
  [/^#\/squadre$/, viewTeamMaker],
  [/^#\/vota\/([\w-]+)$/, viewVote],
];
// Ogni navigazione ha un numero: se nel frattempo ne parte un'altra, il risultato della vecchia
// (arrivato in ritardo dalla rete) viene scartato e i suoi "dopo il render" non partono.
let routeSeq = 0;
const isCurrentRoute = (t) => t === routeSeq;
// da chiamare all'inizio (sincrono) di ogni vista: esegue fn dopo il render solo se la vista è ancora quella mostrata
const laterFor = () => { const t = routeSeq; return (fn) => setTimeout(() => { if (isCurrentRoute(t)) fn(); }); };
async function route() {
  const hash = location.hash || "#/";
  const token = ++routeSeq;
  markNav(hash);
  const app = $("#app");
  for (const [re, fn] of routes) {
    const m = hash.match(re);
    if (m) {
      app.innerHTML = `<div class="empty">Caricamento…</div>`;
      let html;
      try { html = await fn(...m.slice(1)); }
      catch (e) { console.error(e); html = `<div class="card"><h2>Ops</h2><p class="muted">${esc(e.message)}</p></div>`; }
      if (!isCurrentRoute(token)) return;      // nel frattempo l'utente è andato altrove
      app.innerHTML = html; app.classList.add("fade"); bindCommon(app);
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
  return `${demoBanner()}${standingsHead("current")}${await standingsBody(s, true, laterFor())}`;
}

async function viewHistory(seasonId) {
  const past = pastSeasons();
  const s = past.find((x) => x.id === seasonId) || past[0];
  if (!s) return `${standingsHead("history")}<div class="empty">Non ci sono ancora stagioni concluse.</div>`;
  return `${demoBanner()}${standingsHead("history")}
    <div class="season-pills">${past.map((x) => `<a class="pill ${x.id === s.id ? "active" : ""}" href="#/storico/${x.id}">${esc(x.name)}</a>`).join("")}</div>
    ${await standingsBody(s, false, laterFor())}`;
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
async function standingsBody(s, isCurrent, later = (fn) => setTimeout(fn)) {
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

  const podium = (list, key, suffix, sub = (r) => `${r.played} ${r.played === 1 ? "partita" : "partite"}`) => {
    const top = list.slice(0, 3);
    if (top.length < 3 || !top.every((r) => Number(r[key]) > 0)) return "";
    const medal = ["🥇", "🥈", "🥉"];
    return `<div class="podium">${top.map((r, i) => `<div class="step p${i + 1}" data-go="#/giocatore/${r.player_id}">
      <div class="medal">${medal[i]}</div>${avatar(r.nickname)}<div class="name">${esc(r.nickname)}</div>
      <div class="pts">${r[key]}${suffix}</div><div class="sub">${sub(r)}</div></div>`).join("")}</div>`;
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
    </tbody></table></div><p class="small muted">Contano solo le partite con le votazioni chiuse: la classifica si aggiorna alla chiusura di ogni votazione.</p>` : `<div class="empty">Ancora nessuna votazione chiusa in questa stagione. Dopo ogni partita i giocatori in campo votano i compagni: alla chiusura chi ha la media più alta è l'MVP.</div>`;

  later(() => {
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
  <section data-tab="mvp" class="hidden">${podium(byMvp.map((r) => ({ ...r, avg_fmt: Number(r.avg_score).toFixed(2) })), "avg_fmt", "", (r) => `${r.votes} ${r.votes === 1 ? "voto" : "voti"} · ${r.rated_matches} ${r.rated_matches === 1 ? "partita" : "partite"}`)}${tableMvp}</section>`;
}

// ============================================================== PARTITE
// commento firmato (il voto resta anonimo); l'organizzatore lo può cancellare
const commentHtml = (c, who) => `<div class="comment"><div class="who"><span>${who}</span>${isAdmin() && c.rating_id ? `<button type="button" class="cmt-del" data-rmc="${c.rating_id}" aria-label="Cancella commento" title="Cancella commento">🗑</button>` : ""}</div>${esc(c.comment)}</div>`;
const author = (c) => esc(c.author_nickname || nick(c.author_id) || "?");
// commenti raggruppati: groups = [{ key, head (html), items: [commenti] }]; who(c) = intestazione del singolo commento
const commentGroups = (groups, who, empty) => groups.length ? groups.map((g) => `<div class="cmt-group">
    <div class="cmt-head" ${g.go ? `data-go="${g.go}"` : ""}>${g.head}<span class="chip mini">${g.items.length}</span></div>
    ${g.items.map((c) => commentHtml(c, who(c))).join("")}</div>`).join("") : `<p class="muted">${empty}</p>`;
const groupBy = (list, key) => { const m = new Map(); list.forEach((x) => { const k = key(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); }); return m; };
const byDate = (a, b) => String(a.created_at || "").localeCompare(String(b.created_at || ""));
// un solo gestore delegato su #app: funziona per qualunque pagina e indipendentemente da quando arrivano i dati
function bindCommentDelete() {
  $("#app").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rmc]"); if (!b) return;
    e.preventDefault();
    guard(async () => {
      if (!confirm("Cancellare questo commento? Il voto resta.")) return;
      b.disabled = true;
      try { await api.removeComment(b.dataset.rmc); } finally { b.disabled = false; }
      toast("Commento cancellato"); route();
    });
  });
}
function resultChip(m) {
  if (!m.result) return `<span class="chip warn">Risultato da inserire</span>`;
  if (m.result === "pareggio") return `<span class="chip info">Pareggio</span>`;
  return `<span class="chip ok">Vince ${m.result === "bianca" ? "Bianca" : "Nera"}</span>`;
}
const hasScore = (m) => m.score_bianca != null && m.score_nera != null;
const TEAM_LABEL = { bianca: "Bianca", nera: "Nera" };
// pagina partita: un gruppo per giocatore commentato, prima la Bianca poi la Nera, in ordine di nickname
function matchCommentGroups(comments, mps) {
  const teamOf = Object.fromEntries(mps.map((p) => [p.player_id, p.team]));
  const order = (id) => (teamOf[id] === "bianca" ? "0" : teamOf[id] === "nera" ? "1" : "2") + nick(id).toLowerCase();
  return [...groupBy(comments, (c) => c.player_id)].sort(([a], [b]) => order(a).localeCompare(order(b), "it")).map(([pid, items]) => ({
    go: `#/giocatore/${pid}`, items: items.sort(byDate),
    head: `<span class="cmt-who">${avatar(nick(pid))}<b>${esc(nick(pid))}</b>${teamOf[pid] ? `<span class="chip mini team-${teamOf[pid]}">${TEAM_LABEL[teamOf[pid]]}</span>` : ""}</span>`,
  }));
}
// pagina giocatore: un gruppo per partita, dalla più recente
function playerCommentGroups(comments, matches) {
  const mById = Object.fromEntries(matches.map((m) => [m.id, m]));
  const date = (mid, items) => mById[mid]?.played_on || String(items[0].created_at || "").slice(0, 10);
  return [...groupBy(comments, (c) => c.match_id)].sort(([a, x], [b, y]) => date(b, y).localeCompare(date(a, x))).map(([mid, items]) => {
    const m = mById[mid];
    return { go: `#/partita/${mid}`, items: items.sort(byDate),
      head: `<span class="cmt-who"><b>${m ? fmtDate(m.played_on) : "Partita"}</b>${m?.team ? `<span class="chip mini team-${m.team}">${TEAM_LABEL[m.team]}</span>` : ""}</span>` };
  });
}
async function viewMatches() {
  if (!S.season) return `<div class="empty">Nessuna stagione.</div>`;
  const [matches, moms] = await Promise.all([api.getMatches(S.season.id), api.getMomPoints(S.season.id)]);
  const momBy = {};
  moms.forEach((m) => { if (m.match_id) (momBy[m.match_id] ||= []).push(m); });
  const cards = matches.map((m) => `<div class="card match-card" data-go="#/partita/${m.id}">
      <div class="team ${m.result === "bianca" || m.result === "pareggio" ? "win" : ""}"><div class="tname">Bianca</div><div class="count">${hasScore(m) ? m.score_bianca : "–"}</div></div>
      <div class="mid"><div class="date">${fmtDate(m.played_on)}</div><div class="small muted">${m.n_players} giocatori</div></div>
      <div class="team ${m.result === "nera" || m.result === "pareggio" ? "win" : ""}"><div class="tname">Nera</div><div class="count">${hasScore(m) ? m.score_nera : "–"}</div></div>
      <div class="meta">${resultChip(m)}${m.is_valid ? "" : (m.result ? '<span class="chip bad">Non valida</span>' : "")}${m.voting_open ? '<span class="chip info">Voto aperto</span>' : ""}
        ${(momBy[m.id] || []).map((x) => `<span class="chip">${x.source === "mvp" ? "⭐ MVP" : "🏅 MoM"} ${esc(nick(x.player_id))}</span>`).join("")}</div>
    </div>`).join("");
  return `${demoBanner()}<div class="page-head"><div class="grow"><h3>Partite</h3><h1>Tabellini</h1></div>${seasonSelect()}${canScore() ? '<a class="btn" href="#/squadre">🎲 Crea squadre</a><a class="btn primary hide-sm" href="#/tabellino">+ Nuovo tabellino</a>' : ""}</div>${canScore() ? '<a class="fab" href="#/tabellino" aria-label="Nuovo tabellino">+</a>' : ""}
    ${matches.length ? `<div class="grid cols-2">${cards}</div>` : `<div class="empty">Nessuna partita ancora registrata.</div>`}`;
}

async function viewMatch(id) {
  const later = laterFor();
  const all = await api.getMatches(S.season.id);
  let m = all.find((x) => x.id === id);
  if (!m) { // forse di un'altra stagione
    for (const s of S.seasons) { const ms = await api.getMatches(s.id); m = ms.find((x) => x.id === id); if (m) { S.season = s; break; } }
    if (!m) return `<div class="empty">Partita non trovata.</div>`;
  }
  const [mps, allRatings, comments, moms] = await Promise.all([api.getMatchPlayers([id]), api.getMatchRatings(id), api.getComments({ matchId: id }), api.getMomPoints(m.season_id)]);
  // a votazione aperta i voti li vede solo l'organizzatore (lo impone anche il database, vedi 0011)
  const hideVotes = m.voting_open && !isAdmin();
  const ratings = hideVotes ? [] : allRatings;
  const skillsBy = Object.fromEntries((await api.getSkillsFor(mps.map((p) => p.player_id)).catch(() => [])).map((x) => [x.player_id, x]));
  later(() => ["bianca", "nera"].forEach((t) => { fitRadar(`#radar-${t} svg`); document.fonts?.ready.then(() => fitRadar(`#radar-${t} svg`)); }));
  const teamIds = (t) => mps.filter((p) => p.team === t).map((p) => p.player_id);
  const rt = Object.fromEntries(ratings.map((r) => [r.player_id, r]));
  const momHere = moms.filter((x) => x.match_id === id);
  const sea = S.seasons.find((s) => s.id === m.season_id);
  const mvps = ratings.filter((r) => r.is_mvp);
  const me = myPlayer();
  const iPlayed = me && mps.some((p) => p.player_id === me);
  const col = (team) => {
    const list = mps.filter((p) => p.team === team).map((p) => ({ ...p, nickname: nick(p.player_id) })).sort((a, b) => a.nickname.localeCompare(b.nickname, "it"));
    const won = m.result === team || m.result === "pareggio";
    return `<div class="col ${team} ${won ? "win" : ""}"><h3>Squadra ${team}<span class="team-score">${hasScore(m) ? m["score_" + team] : "–"}</span></h3>
      ${list.map((p) => `<div class="pl" data-go="#/giocatore/${p.player_id}"><span>${avatar(p.nickname)} ${esc(p.nickname)}${rt[p.player_id]?.is_mvp ? ' <span class="mvp-badge">⭐ MVP</span>' : ""}${momHere.some((x) => x.player_id === p.player_id && x.source === "manuale") ? ' <span title="Man of the Match">🏅</span>' : ""}</span>
        ${rt[p.player_id] ? `<span class="score" title="${rt[p.player_id].votes} voti">${Number(rt[p.player_id].avg_score).toFixed(1)}</span>` : ""}</div>`).join("") || '<div class="muted small">Nessuno</div>'}</div>`;
  };
  return `<div class="page-head"><div class="grow"><h3>Partita</h3><h1>${fmtDate(m.played_on)}</h1>${hasScore(m) ? `<div class="scoreline"><span>Bianca</span><b>${m.score_bianca} – ${m.score_nera}</b><span>Nera</span></div>` : ""}<div class="row">${resultChip(m)}${m.is_valid ? '<span class="chip ok">Valida</span>' : '<span class="chip bad">Non valida (' + m.n_players + ' giocatori)</span>'}${m.voting_open ? `<span class="chip info">Voto aperto fino a ${fmtShort(lastVoteDay(m))}</span>` : ""}</div></div>
      <div class="row">${iPlayed && m.voting_open && !DEMO ? `<a class="btn primary" href="#/vota/${m.id}">⭐ Vota i compagni</a>` : ""}${canScore() ? `<a class="btn" href="#/tabellino/${m.id}">Modifica</a>` : ""}</div></div>
    <div class="roster">${col("bianca")}${col("nera")}</div>
    <div class="grid cols-2 team-sk-grid">${teamSkillsCard("bianca", teamIds("bianca"), skillsBy)}${teamSkillsCard("nera", teamIds("nera"), skillsBy)}</div>
    ${m.notes ? `<p class="muted">${esc(m.notes)}</p>` : ""}
    <div class="grid cols-2" style="margin-top:1rem">
      <div class="card"><h2>Valutazioni</h2>${hideVotes ? `<p class="vote-lock">🔒 <span>I voti restano nascosti finché le votazioni sono aperte (fino a <b>${fmtDate(lastVoteDay(m))}</b>). Alla chiusura compaiono le medie e l'MVP, e si aggiorna la classifica MVP.</span></p>`
        : ratings.length ? `${m.voting_open ? '<p class="vote-lock admin">👁 <span>Votazioni aperte: le medie le vedi solo tu, come organizzatore, fino alla chiusura.</span></p>' : ""}<p class="small muted">${((n) => `${n} ${n === 1 ? "voto espresso" : "voti espressi"}`)(ratings.reduce((a, r) => a + r.votes, 0))}. ${m.voting_open ? `Votazioni aperte fino a ${fmtDate(lastVoteDay(m))}: alla chiusura diventa MVP chi ha la media più alta (a pari media, più MVP).` : (mvps.length ? `MVP: <b>${mvps.map((r) => esc(nick(r.player_id))).join(", ")}</b>${m.is_valid ? "" : " (partita non valida: niente punto)"}.` : `Nessun MVP: serviva almeno ${sea.min_votes_mvp} voti.`)}</p>
        ${[...ratings].sort((a, b) => b.avg_score - a.avg_score).map((r) => `<div class="row" style="justify-content:space-between;padding:.3rem 0;border-bottom:1px solid var(--line)"><span>${r.is_mvp ? "⭐ " : ""}${esc(nick(r.player_id))}</span><span class="row" style="flex:0 0 55%"><div class="bar" style="flex:1"><i style="width:${r.avg_score * 10}%"></i></div><b>${Number(r.avg_score).toFixed(2)}</b><span class="small muted">(${r.votes})</span></span></div>`).join("")}`
        : `<p class="muted">${m.voting_open ? `Ancora nessun voto: chi ha giocato può votare fino a ${fmtDate(lastVoteDay(m))}. Alla chiusura viene assegnato l'MVP.` : "Nessun voto."}</p>`}</div>
      <div class="card"><h2>Commenti</h2>${commentGroups(matchCommentGroups(comments, mps), (c) => `da <b>${author(c)}</b>`, "Nessun commento.")}</div>
    </div>`;
}

// ============================================================== CARATTERISTICHE (radar 0–5)
// assi del radar: le chiavi sono fisse (colonne del database), le etichette le sceglie l'organizzatore
const SKILL_DEFAULTS = { lancio: "Lancio", ricezione: "Ricezione", taglio: "Taglio", difesa: "Difesa", velocita: "Velocità", resistenza: "Resistenza" };
const skillLabel = (k, labels = S.settings.skill_labels) => (labels?.[k] || "").trim() || SKILL_DEFAULTS[k];
// etichette lunghe su due righe, spezzate allo spazio più vicino a metà
const wrapLabel = (t) => {
  if (t.length <= 12 || !t.includes(" ")) return [t];
  const sp = [...t].map((c, i) => c === " " ? i : -1).filter((i) => i > 0);
  const cut = sp.reduce((a, b) => Math.abs(b - t.length / 2) < Math.abs(a - t.length / 2) ? b : a);
  return [t.slice(0, cut), t.slice(cut + 1)];
};
const skillDefs = (labels) => Object.keys(SKILL_DEFAULTS).map((k) => [k, wrapLabel(skillLabel(k, labels))]);
const canEditSkills = () => ["admin", "coach"].includes(S.me?.role);
// valore generale: somma dei sei assi (0–30)
const SKILL_MAX = 5 * Object.keys(SKILL_DEFAULTS).length;
const skillTotal = (v) => Object.keys(SKILL_DEFAULTS).reduce((a, k) => a + (Number(v?.[k]) || 0), 0);
const totalBox = (val, id = "", label = "Valore generale") => `<div class="sk-total" title="Somma dei sei valori"><span class="lbl">${label}</span><span><b ${id ? `id="${id}"` : ""}>${val}</b><span class="of"> / ${SKILL_MAX}</span></span></div>`;

// dec = 1 per mostrare i valori con un decimale (medie di squadra)
function radarSvg(v, axisLabels, dec = 0) {
  const SKILLS = skillDefs(axisLabels);
  const show = (x) => (Number(x) || 0).toFixed(dec);
  const cx = 200, cy = 170, R = 120, n = SKILLS.length;
  const pt = (i, r) => { const a = (-90 + (360 / n) * i) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  const poly = (r) => SKILLS.map((_, i) => pt(i, typeof r === "function" ? r(i) : r).map((x) => x.toFixed(1)).join(",")).join(" ");
  const rings = [1, 2, 3, 4, 5].map((k) => `<polygon class="r-ring${k === 5 ? " outer" : ""}" points="${poly((R * k) / 5)}"/>`).join("");
  const axes = SKILLS.map((_, i) => { const [x, y] = pt(i, R); return `<line class="r-axis" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join("");
  const val = (i) => (R * (Number(v[SKILLS[i][0]]) || 0)) / 5;
  const dots = SKILLS.map((_, i) => { const [x, y] = pt(i, val(i)); return `<circle class="r-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5"/>`; }).join("");
  // etichette vicine ai vertici, sempre verso l'esterno: sopra quelli alti, sotto quelli bassi
  const labels = SKILLS.map(([k, lines], i) => {
    const [vx, vy] = pt(i, R);
    let x = vx, anchor = "middle";
    if (Math.abs(vx - cx) > 10) { anchor = vx > cx ? "start" : "end"; x = vx + (vx > cx ? -6 : 6); }
    const y = vy < cy - 1 ? vy - 14 - (lines.length - 1) * 18 : vy + 26;
    const tl = lines.map((l, j) => `<tspan x="${x.toFixed(1)}" ${j ? 'dy="18"' : ""}>${esc(l)}${j === lines.length - 1 ? ` <tspan class="r-val">${show(v[k])}</tspan>` : ""}</tspan>`).join("");
    return `<text class="r-label" text-anchor="${anchor}" x="${x.toFixed(1)}" y="${y.toFixed(1)}">${tl}</text>`;
  }).join("");
  const desc = SKILLS.map(([k, l]) => `${l.join(" ")} ${show(v[k])} su 5`).join(", ");
  return `<svg class="radar" viewBox="0 0 400 340" role="img" aria-label="Caratteristiche: ${esc(desc)}">${rings}${axes}
    <polygon class="r-area" points="${poly(val)}"/>${dots}${labels}</svg>`;
}
// adatta il viewBox al contenuto reale (etichette comprese): il radar usa tutta la larghezza disponibile
function fitRadar(sel = "#radar svg") {
  const svg = $(sel); if (!svg) return;
  try { const b = svg.getBBox(), pad = 6; svg.setAttribute("viewBox", `${b.x - pad} ${b.y - pad} ${b.width + 2 * pad} ${b.height + 2 * pad}`); } catch {}
}

function skillsCard(playerId, skills, later = (fn) => setTimeout(fn)) {
  const SKILLS = skillDefs();
  const v = Object.fromEntries(SKILLS.map(([k]) => [k, skills?.[k] ?? 0]));
  const edit = canEditSkills() && !DEMO;
  later(() => { fitRadar(); document.fonts?.ready.then(() => fitRadar()); });
  if (edit) later(() => {
    const box = $("#skills"); if (!box) return;
    box.addEventListener("click", (e) => {
      const b = e.target.closest("[data-sk]"); if (!b) return;
      v[b.dataset.sk] = Number(b.dataset.v);
      box.querySelectorAll(`[data-sk="${b.dataset.sk}"]`).forEach((x) => x.classList.toggle("active", x === b));
      $("#radar").innerHTML = radarSvg(v); fitRadar(); $("#sk-save").disabled = false;
      $("#sk-total").textContent = skillTotal(v);
    });
    $("#sk-save").onclick = () => guard(async () => {
      $("#sk-save").disabled = true;
      try { await api.saveSkills(playerId, v); toast("Caratteristiche salvate"); }
      catch (e) { $("#sk-save").disabled = false; throw e; }
    });
  });
  return `<section class="card skills" id="skills"><div class="sk-head"><div><h2 style="margin:0">Caratteristiche</h2>${skills ? "" : '<span class="chip" style="margin-top:.3rem">da valutare</span>'}</div>${totalBox(skillTotal(v), "sk-total")}</div>
    <div class="skills-body"><div id="radar">${radarSvg(v)}</div>
    ${edit ? `<div class="sk-edit"><p class="small muted" style="margin:.2rem 0 .4rem">Valori da 0 a 5, modificabili da organizzatori e allenatori.</p>
      ${SKILLS.map(([k, l]) => `<div class="sk-row"><span class="sk-name">${esc(l.join(" "))}</span><div class="sk-seg" role="radiogroup" aria-label="${esc(l.join(" "))}">${[0, 1, 2, 3, 4, 5].map((n) => `<button type="button" data-sk="${k}" data-v="${n}" class="${v[k] === n ? "active" : ""}" aria-label="${n}">${n}</button>`).join("")}</div></div>`).join("")}
      <button class="btn primary" id="sk-save" disabled style="margin-top:.8rem;width:100%">Salva caratteristiche</button></div>`
    : (skills ? "" : '<p class="small muted" style="text-align:center;margin:0">Non ancora valutato dagli allenatori.</p>')}</div></section>`;
}

// Caratteristiche di squadra: media per asse e media del valore generale, sui soli giocatori già valutati
function teamSkillsCard(team, playerIds, skillsBy) {
  const rated = playerIds.map((id) => skillsBy[id]).filter(Boolean);
  const keys = Object.keys(SKILL_DEFAULTS);
  const r1 = (x) => Math.round(x * 10) / 10;
  const avg = Object.fromEntries(keys.map((k) => [k, rated.length ? r1(rated.reduce((a, s) => a + (Number(s[k]) || 0), 0) / rated.length) : 0]));
  const avgTotal = rated.length ? r1(rated.reduce((a, s) => a + skillTotal(s), 0) / rated.length) : 0;
  return `<section class="vote-team ${team} team-sk"><h2 class="vt-head"><span>Caratteristiche <small>Squadra ${team === "bianca" ? "Bianca" : "Nera"}</small></span>
      <span class="chip">valutati ${rated.length}/${playerIds.length}</span></h2>
    <div class="team-sk-body">${rated.length ? `${totalBox(avgTotal.toFixed(1), "", "Valore medio")}<div class="team-radar" id="radar-${team}">${radarSvg(avg, undefined, 1)}</div>`
      : '<p class="muted small" style="margin:0">Nessun giocatore di questa squadra è ancora stato valutato dagli allenatori.</p>'}</div></section>`;
}

// ============================================================== GIOCATORI
async function viewPlayers() {
  const later = laterFor();
  const rows = S.season ? await api.getStandings(S.season.id) : [];
  const st = Object.fromEntries(rows.map((r) => [r.player_id, r]));
  // tutti i giocatori: quelli non attivi compaiono solo cercandoli
  const list = [...S.players].sort((a, b) => (st[b.id]?.points || 0) - (st[a.id]?.points || 0) || a.nickname.localeCompare(b.nickname, "it"));
  later(() => {
    const q = $("#pl-q"), cards = [...document.querySelectorAll(".player-card")];
    const apply = () => {
      const t = q.value.trim().toLowerCase();
      let n = 0;
      cards.forEach((c) => { const show = t ? c.dataset.k.includes(t) : c.dataset.active === "1"; c.classList.toggle("hidden", !show); n += show; });
      $("#pl-empty").classList.toggle("hidden", n > 0);
    };
    q.oninput = apply; apply();
  });
  return `${demoBanner()}<div class="page-head"><div class="grow"><h3>Rosa</h3><h1>Giocatori</h1></div>${S.season ? seasonSelect() : ""}</div>
    <input type="search" id="pl-q" class="search" placeholder="Cerca giocatore…" autocomplete="off" aria-label="Cerca giocatore" />
    <div class="player-grid">${list.map((p) => { const r = st[p.id]; return `<div class="card player-card" data-go="#/giocatore/${p.id}" data-active="${p.active ? 1 : 0}" data-k="${esc((p.nickname + " " + (p.full_name || "")).toLowerCase())}">${avatar(p.nickname, "lg")}<div class="nick">${esc(p.nickname)}</div>
      <div class="small muted">${r?.played ? `${r.points} pt · ${r.played} gg · ${Number(r.efficiency).toFixed(0)}%` : "Non ha ancora giocato"}${p.active ? "" : " · ex"}</div></div>`; }).join("")}</div>
    <div id="pl-empty" class="empty hidden">Nessun giocatore trovato.</div>`;
}

async function viewPlayer(id) {
  const later = laterFor();
  const p = S.pmap.get(id);
  if (!p) return `<div class="empty">Giocatore non trovato.</div>`;
  const [seasons, matches, comments, skills, myRatings] = await Promise.all([api.getPlayerSeasons(id), api.getPlayerMatches(id), api.getComments({ playerId: id }), api.getSkills(id).catch(() => null), api.getPlayerMatchRatings(id).catch(() => [])]);
  const ratingsBySeason = {};
  const allRatings = await Promise.all(S.seasons.map((s) => api.getSeasonRatings(s.id)));   // in parallelo, non una stagione alla volta
  S.seasons.forEach((s, i) => { ratingsBySeason[s.id] = allRatings[i].find((r) => r.player_id === id); });
  const cur = seasons.find((s) => s.season_id === S.season?.id) || seasons[0];
  // andamento: per ogni partita della stagione risultato (quadratino) e media dei voti ricevuti (barra)
  // a votazione aperta la media della partita la vede solo l'organizzatore
  const openIds = new Set(matches.filter((m) => m.voting_open).map((m) => m.id));
  const rByMatch = Object.fromEntries(myRatings.filter((r) => isAdmin() || !openIds.has(r.match_id)).map((r) => [r.match_id, r]));
  const seasonMatches = matches.filter((m) => m.season_id === cur?.season_id).sort((a, b) => a.played_on.localeCompare(b.played_on));
  const outcome = (m) => !m.result || !m.is_valid ? ["x", "–", m.result ? "non valida" : "da registrare"] : m.result === "pareggio" ? ["n", "N", "pareggio"] : m.result === m.team ? ["v", "V", "vittoria"] : ["p", "P", "sconfitta"];
  const voteCls = (v) => v >= 7 ? "hi" : v >= 5.5 ? "mid" : "lo";
  const trend = seasonMatches.map((m) => {
    const [cls, letter, label] = outcome(m), r = rByMatch[m.id], v = r ? Number(r.avg_score) : null;
    return `<a class="am" href="#/partita/${m.id}" title="${fmtDate(m.played_on)}: ${label}${v != null ? ` · media voti ${v.toFixed(2)} (${r.votes})` : m.voting_open ? " · votazione aperta: la media si vede alla chiusura" : ""}">
      <span class="am-date">${fmtShort(m.played_on)}</span><span class="am-res ${cls}">${letter}</span>
      <span class="am-bar">${v != null ? `<i class="${voteCls(v)}" style="height:${v * 10}%"></i>` : ""}</span>
      <span class="am-vote ${v != null ? voteCls(v) : ""}">${v != null ? v.toFixed(1) : m.voting_open ? "🔒" : "–"}</span><span class="am-mvp">${r?.is_mvp ? "⭐" : ""}</span></a>`;
  }).join("");
  const voted = seasonMatches.map((m) => rByMatch[m.id]).filter(Boolean);
  // mete fatte e subite dalla squadra in cui ha giocato, sulle partite della stagione con il punteggio inserito
  const scored = seasonMatches.filter((m) => hasScore(m) && m.team);
  const other = (t) => (t === "bianca" ? "nera" : "bianca");
  const goalsFor = scored.reduce((a, m) => a + m["score_" + m.team], 0), goalsAgainst = scored.reduce((a, m) => a + m["score_" + other(m.team)], 0);
  const rr = cur ? ratingsBySeason[cur.season_id] : null;
  later(() => { const t = $("#trend"); if (t) t.scrollLeft = t.scrollWidth; });
  return `<div class="page-head"><div class="grow row">${avatar(p.nickname, "lg")}<div><h3>Giocatore</h3><h1>${esc(p.nickname)}</h1>${p.full_name ? `<div class="muted">${esc(p.full_name)}</div>` : ""}</div></div></div>
    ${skillsCard(id, skills, later)}
    ${cur ? `<div class="card"><h2>Stagione ${esc(cur.season_name)}</h2>
      <div class="stats"><div class="stat"><b>${cur.rank_points}°</b><span>posizione</span></div><div class="stat"><b>${cur.points}</b><span>punti</span></div><div class="stat"><b>${cur.played}</b><span>giocate</span></div>
        <div class="stat"><b>${cur.wins}</b><span>vinte</span></div><div class="stat"><b>${cur.losses}</b><span>perse</span></div><div class="stat"><b>${cur.mom}</b><span>MoM/MVP</span></div>
        <div class="stat"><b>${Number(cur.efficiency).toFixed(0)}%</b><span>efficienza</span></div>${rr ? `<div class="stat"><b>${Number(rr.avg_score).toFixed(2)}</b><span>media voti</span></div>` : ""}
        <div class="stat"><b>${scored.length ? goalsFor : "–"}</b><span>mete fatte</span></div><div class="stat"><b>${scored.length ? goalsAgainst : "–"}</b><span>mete subite</span></div></div>
      <p class="small muted" style="margin:.6rem 0 0">Mete fatte e subite dalla sua squadra ${scored.length ? `in ${scored.length} ${scored.length === 1 ? "partita" : "partite"}${scored.length < seasonMatches.length ? ` su ${seasonMatches.length} (le altre non hanno il punteggio)` : ""}` : "(nessuna partita della stagione ha ancora il punteggio)"}.</p>
</div>
    <div class="card" style="margin-top:1rem"><div class="row" style="justify-content:space-between"><h2 style="margin:0">Andamento</h2><span class="small muted">${seasonMatches.length} partite · ${voted.length} con voti</span></div>
      ${seasonMatches.length ? `<div class="trend" id="trend">${trend}</div>
      <div class="legend"><span><i class="lgd v"></i>vittoria</span><span><i class="lgd n"></i>pareggio</span><span><i class="lgd p"></i>sconfitta</span><span><i class="lgd x"></i>non valida</span><span>barra = media voti ricevuti · ⭐ MVP · 🔒 votazione aperta</span></div>` : '<p class="muted">Nessuna partita in questa stagione.</p>'}</div>` : `<div class="card"><p class="muted">Non ha ancora giocato partite.</p></div>`}
    <div class="grid cols-2" style="margin-top:1rem">
      <div class="card"><h2>Tutte le stagioni</h2><div class="table-wrap" style="box-shadow:none"><table><thead><tr><th class="name">Stagione</th><th>#</th><th>G</th><th>V</th><th>P</th><th>MoM</th><th>Pt</th></tr></thead><tbody>
        ${seasons.sort((a, b) => b.season_name.localeCompare(a.season_name)).map((s) => `<tr><td class="name">${esc(s.season_name)}</td><td>${s.rank_points}</td><td>${s.played}</td><td>${s.wins}</td><td>${s.losses}</td><td>${s.mom}</td><td class="pts">${s.points}</td></tr>`).join("") || '<tr><td colspan="7" class="muted">—</td></tr>'}</tbody></table></div></div>
      <div class="card"><h2>Ultime partite</h2>${matches.slice(0, 8).map((m) => `<div class="row" style="justify-content:space-between;padding:.35rem 0;border-bottom:1px solid var(--line)" data-go="#/partita/${m.id}"><span>${fmtDate(m.played_on)} · <span class="muted small">${m.team}</span></span>${resultChip(m)}</div>`).join("") || '<p class="muted">—</p>'}</div>
    </div>
    <div class="card" style="margin-top:1rem"><h2>Commenti ricevuti</h2>${commentGroups(playerCommentGroups(comments, matches), (c) => `da <b>${author(c)}</b>`, "Nessun commento ancora.")}</div>`;
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
  const s = currentSeason() || S.season;
  const vd = s?.voting_days ?? 7, mv = s?.min_votes_mvp ?? 3;
  const myRole = S.me?.status === "approved" ? S.me.role : null;
  const guide = [
    ["all", "👀 Tutti (anche senza accesso)", `<ul>
      <li><b>Classifica</b>: la stagione in corso con tutta la rosa (anche a 0 punti) e, nella scheda <b>Storico</b>, le stagioni passate. Sotto-schede Impegno, Efficienza e MVP.</li>
      <li><b>Partite</b>: tutti i tabellini con squadre, risultato, punteggio, MVP e commenti (firmati da chi li ha scritti).</li>
      <li><b>Giocatori</b>: cerca un giocatore e apri la sua scheda: caratteristiche (radar), statistiche della stagione, andamento partita per partita con i voti ricevuti.</li>
      <li><b>Albo d'oro</b> e <b>Regolamento</b>.</li></ul>`],
    ["player", "🥏 Giocatore", `<ol>
      <li><b>Registrati</b> da <i>Area → Registrati</i> con nickname (quello usato in squadra), nome e cognome, email e password.</li>
      <li>Aspetta che l'organizzatore <b>accetti la richiesta</b>: verrai collegato al tuo giocatore.</li>
      <li>Dopo ogni partita in cui hai giocato, in <i>Area</i> trovi <b>Vota i compagni</b>: tocca un voto da 1 a 10 per chi vuoi valutare, divisi tra la tua squadra e gli avversari, con un commento facoltativo. Chi non tocchi non riceve voti.</li>
      <li>Si vota per <b>${vd} giorni</b> dal giorno della partita (con le partite del venerdì, fino al giovedì) e puoi modificare i voti fino alla chiusura. I voti sono <b>anonimi</b>; i commenti invece mostrano il tuo nickname.</li>
      <li>Alla chiusura diventa <b>MVP</b> chi ha la media più alta (con almeno ${mv} voti; a pari media più MVP) e prende il punto Man of the Match.</li></ol>`],
    ["coach", "📋 Allenatore", `<p>Tutto quello che fa il giocatore, più:</p><ul>
      <li><b>Tabellini</b>: <i>Area → Nuovo tabellino</i> (o il "+" nella pagina Partite). Stagione e data sono già quelle di oggi; scegli il risultato e, se vuoi, il punteggio (il risultato si calcola da solo). Poi seleziona "Aggiungi a Bianca/Nera" e tocca i nomi: compaiono subito nella squadra; × per toglierli.</li>
      <li><b>MoM manuali</b>: in <i>Area</i> puoi assegnare un Man of the Match in più (+1 punto).</li>
      <li><b>Caratteristiche</b>: nella scheda di ogni giocatore imposti i valori da 0 a 5 del radar (Lancio, Ricezione, Taglio, Difesa, Velocità, Resistenza).</li></ul>`],
    ["scorekeeper", "✍️ Score keeper", `<ul><li>Inserisce e corregge i <b>tabellini</b> e assegna i <b>MoM manuali</b>, come l'allenatore (ma non modifica le caratteristiche).</li></ul>`],
    ["admin", "⚙️ Organizzatore", `<p>Tutto quanto sopra, più <i>Area → Amministrazione</i>:</p><ul>
      <li><b>Utenti</b>: accetta o rifiuta le <b>richieste di registrazione</b>. Accettando, l'utente viene collegato al giocatore con lo stesso nickname, o il giocatore viene creato. Qui assegni i ruoli (Giocatore, Allenatore, Score keeper, Organizzatore) ed elimini un account (il giocatore e le sue statistiche restano).</li>
      <li><b>Giocatori</b>: anagrafica e giocatori attivi.</li>
      <li><b>Stagioni</b>: date e regole (punti, minimo giocatori, giorni di voto, voti minimi per l'MVP) e stagione in corso.</li>
      <li><b>Testi e albo</b>: regolamento, nome del club e albo d'oro. Può anche eliminare le partite.</li>
      <li><b>Commenti</b>: può cancellare un commento con 🗑 (nella partita o nella scheda del giocatore); il voto resta.</li></ul>`],
  ];
  return `<div class="page-head"><div class="grow"><h3>Regole</h3><h1>Regolamento</h1></div></div>
    <div class="card"><div class="regola">${esc(S.settings.regolamento || "Regolamento non ancora inserito.")}</div></div>
    <section class="card guide" style="margin-top:1rem"><h2>Come usare il sito</h2>
      <p class="small muted">Tocca il tuo ruolo per vedere cosa puoi fare.${myRole ? ` Tu sei: <b>${ROLE_LABEL[myRole]}</b>.` : ""}</p>
      ${guide.map(([k, t, body]) => `<details ${k === (myRole || "all") ? "open" : ""}><summary>${t}</summary><div class="guide-body">${body}</div></details>`).join("")}
    </section>
    ${s ? `<div class="card" style="margin-top:1rem"><h2>Parametri stagione ${esc(s.name)}</h2><div class="stats">
      <div class="stat"><b>${s.points_win}</b><span>pt vittoria</span></div><div class="stat"><b>${s.points_draw}</b><span>pt pareggio</span></div><div class="stat"><b>${s.points_mom}</b><span>pt MVP</span></div>
      <div class="stat"><b>${s.min_players_valid}</b><span>min giocatori</span></div><div class="stat"><b>${s.min_matches_ranking}</b><span>gg per la coppa</span></div><div class="stat"><b>${s.min_matches_efficiency}</b><span>gg efficienza</span></div>
      <div class="stat"><b>${s.voting_days}</b><span>giorni di voto</span></div><div class="stat"><b>${s.min_votes_mvp}</b><span>voti min. MVP</span></div></div></div>` : ""}`;
}

// ============================================================== LOGIN
async function viewLogin(mode) {
  const later = laterFor();
  if (DEMO) return `<div class="card login-box"><span class="logo" role="img" aria-label="Disc &amp; Disc"></span><h2>Modalità demo</h2><p class="muted">Il login si attiva collegando un progetto Supabase in <code>config.js</code>.</p></div>`;
  if (S.user) { location.hash = "#/area"; return ""; }
  const signup = mode === "registrati";
  later(() => {
    const f = $("#login-form");
    f.onsubmit = (e) => { e.preventDefault(); guard(async () => {
      const email = f.email.value.trim();
      if (signup) {
        const nickname = f.nickname.value.trim(), fullName = f.full_name.value.trim();
        if (!nickname || !fullName) throw new Error("Inserisci nickname e nome e cognome");
        if (f.password.value.length < 6) throw new Error("La password deve avere almeno 6 caratteri");
        await api.auth.signUp(email, f.password.value, nickname, fullName);
        $("#app").innerHTML = `<div class="card login-box"><span class="logo" role="img" aria-label="Disc &amp; Disc"></span><h2>Richiesta inviata</h2>
          <p>Grazie <b>${esc(nickname)}</b>! Se ti arriva un'email di conferma, apri il link. Poi l'organizzatore deve <b>accettare la registrazione</b>: da quel momento potrai votare i compagni.</p><a class="btn" href="#/login">Torna all'accesso</a></div>`;
        return;
      }
      await api.auth.signIn(email, f.password.value); toast("Bentornato!"); location.hash = "#/area";
    }); };
    const ml = $("#btn-magic"); if (ml) ml.onclick = () => guard(async () => {
      if (!f.email.value) throw new Error("Inserisci l'email");
      await api.auth.magicLink(f.email.value.trim()); toast("Se l'email è registrata ti arriva un link di accesso.");
    });
  });
  return `<div class="card login-box"><span class="logo" role="img" aria-label="Disc &amp; Disc"></span>
    <div class="tabs seg" style="margin:0 auto 1rem"><a class="${signup ? "" : "active"}" href="#/login">Accedi</a><a class="${signup ? "active" : ""}" href="#/registrati">Registrati</a></div>
    <p class="small muted">${signup ? "Dopo la registrazione l'organizzatore accetta la richiesta e ti collega al tuo giocatore (o lo crea, se il nickname è nuovo)." : "Accedi con email e password."}</p>
    <form id="login-form">
      ${signup ? `<label>Nickname</label><input type="text" name="nickname" required maxlength="40" autocomplete="nickname" placeholder="come ti chiamano in squadra" />
      <label>Nome e cognome</label><input type="text" name="full_name" required maxlength="80" autocomplete="name" />` : ""}
      <label>Email</label><input type="email" name="email" required autocomplete="email" />
      <label>Password</label><input type="password" name="password" required minlength="6" autocomplete="${signup ? "new-password" : "current-password"}" />
      <button class="btn primary" type="submit" style="width:100%;margin-top:1rem">${signup ? "Invia richiesta di registrazione" : "Accedi"}</button>
      ${signup ? "" : '<button class="btn" type="button" id="btn-magic" style="width:100%;margin-top:.5rem">Accedi con un link via email</button>'}
    </form></div>`;
}

// ============================================================== AREA RISERVATA
async function viewArea() {
  const later = laterFor();
  if (DEMO) return viewLogin();
  if (!S.user) { location.hash = "#/login"; return ""; }
  // chi non è ancora approvato rilegge lo stato ogni volta: l'approvazione deve vedersi senza rifare l'accesso
  if (S.me?.status !== "approved") { S.me = await api.auth.me(); renderUserbox(); }
  const me = S.me;
  if (me && me.status !== "approved") {
    later(() => {
      $("#btn-logout").onclick = () => guard(async () => { await api.auth.signOut(); location.hash = "#/"; });
      const rc = $("#btn-recheck"); if (rc) rc.onclick = () => guard(async () => { S.me = await api.auth.me(); if (S.me?.status === "approved") toast("Registrazione accettata!"); route(); });
    });
    return `<div class="card login-box"><span class="logo" role="img" aria-label="Disc &amp; Disc"></span>
      ${me.status === "pending" ? `<h2>Registrazione in attesa</h2><p>Hai chiesto di entrare come <b>${esc(me.requested_nickname || "?")}</b>${me.requested_full_name ? ` (${esc(me.requested_full_name)})` : ""}. L'organizzatore deve accettare la richiesta: poi potrai votare i compagni.</p>`
        : `<h2>Registrazione non accettata</h2><p class="muted">L'organizzatore non ha accettato la richiesta. Se pensi sia un errore, parlane con lui.</p>`}
      <p class="small muted">${esc(S.user.email)}</p><div class="row">${me.status === "pending" ? '<button class="btn primary" id="btn-recheck">Ricontrolla</button>' : ""}<button class="btn" id="btn-logout">Esci</button></div></div>`;
  }
  const roleLabel = ROLE_LABEL[me?.role] || "–";
  const pending = isAdmin() ? (await api.getProfiles()).filter((p) => p.status === "pending").length : 0;
  // partite votabili per il giocatore
  let votable = [];
  if (myPlayer() && currentSeason()) {
    const ms = await api.getMatches(currentSeason().id);
    const open = ms.filter((m) => m.voting_open);
    if (open.length) {
      const mps = await api.getMatchPlayers(open.map((m) => m.id));
      votable = open.filter((m) => mps.some((p) => p.match_id === m.id && p.player_id === myPlayer()));
    }
  }
  later(() => {
    $("#btn-logout").onclick = () => guard(async () => { await api.auth.signOut(); location.hash = "#/"; });
    if (!isAdmin() && canScore()) renderMomAdmin();
    const tabs = $("#area-tabs");
    if (tabs) tabs.querySelectorAll("button").forEach((b) => b.onclick = () => {
      tabs.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
      document.querySelectorAll("[data-atab]").forEach((sec) => sec.classList.toggle("hidden", sec.dataset.atab !== b.dataset.t));
      const box = document.querySelector(`[data-atab="${b.dataset.t}"]`); if (box) box.innerHTML = `<div class="empty">Caricamento…</div>`;
      if (b.dataset.t === "players") renderAdminPlayers(); if (b.dataset.t === "users") renderAdminUsers(); if (b.dataset.t === "seasons") renderAdminSeasons(); if (b.dataset.t === "texts") renderAdminTexts(); if (b.dataset.t === "radar") renderAdminRadar();
      if (b.dataset.t === "mom") renderMomAdmin();
    });
  });
  return `<div class="page-head"><div class="grow row">${avatar(me?.nickname || S.user.email, "lg")}<div><h3>${roleLabel}</h3><h1>${esc(me?.nickname || S.user.email)}</h1><div class="small muted">${esc(S.user.email)}</div></div></div><button class="btn" id="btn-logout">Esci</button></div>
    ${!me?.player_id ? `<div class="card" style="margin-bottom:1rem"><h2>Account non collegato a un giocatore</h2><p class="muted">Chiedi all'organizzatore di collegare il tuo account (${esc(S.user.email)}) al tuo nickname: potrai votare i compagni dopo le partite.</p></div>` : ""}
    <div class="grid cols-2">
      ${me?.player_id ? `<div class="card"><h2>⭐ Vota i compagni</h2>${votable.length ? votable.map((m) => `<div class="row" style="justify-content:space-between;padding:.4rem 0;border-bottom:1px solid var(--line)"><span>${fmtDate(m.played_on)} <span class="small muted">entro ${fmtShort(lastVoteDay(m))}</span></span><a class="btn sm primary" href="#/vota/${m.id}">Vota</a></div>`).join("") : `<p class="muted">Nessuna partita con votazioni aperte in cui hai giocato. Si vota per ${currentSeason()?.voting_days ?? 7} giorni a partire dal giorno della partita.</p>`}</div>` : ""}
      ${canScore() ? `<div class="card"><h2>📋 Tabellini</h2><p class="muted small">Registra la partita del venerdì: squadre, vincente e, se serve, MoM assegnati a mano.</p><div class="row"><a class="btn primary" href="#/tabellino">+ Nuovo tabellino</a><a class="btn" href="#/partite">Elenco partite</a></div></div>` : ""}
    </div>
    ${isAdmin() ? `<div style="margin-top:1.5rem"><h2>Amministrazione</h2>
      <div class="tabs" id="area-tabs"><button data-t="none" class="active">—</button><button data-t="players">Giocatori</button><button data-t="users">Utenti${pending ? ` <span class="badge">${pending}</span>` : ""}</button><button data-t="seasons">Stagioni</button><button data-t="mom">MoM manuali</button><button data-t="radar">Radar</button><button data-t="texts">Testi e albo</button></div>
      <div data-atab="players" class="hidden card" style="margin-top:1rem" id="adm-players"></div>
      <div data-atab="users" class="hidden card" style="margin-top:1rem" id="adm-users"></div>
      <div data-atab="seasons" class="hidden card" style="margin-top:1rem" id="adm-seasons"></div>
      <div data-atab="mom" class="hidden card" style="margin-top:1rem" id="adm-mom"></div>
      <div data-atab="radar" class="hidden card" style="margin-top:1rem" id="adm-radar"></div>
      <div data-atab="texts" class="hidden card" style="margin-top:1rem" id="adm-texts"></div></div>` : (canScore() ? `<div class="card" style="margin-top:1rem" id="adm-mom"></div>` : "")}`;
}

// ---- admin: giocatori
async function renderAdminPlayers() {
  const el = $("#adm-players"); if (!el) return;
  S.players = await api.getPlayers(); S.pmap = new Map(S.players.map((p) => [p.id, p]));
  // email dell'account collegato: sta nel profilo (leggibile solo dall'organizzatore), non nella tabella pubblica dei giocatori
  const account = Object.fromEntries((await api.getProfiles()).filter((u) => u.player_id).map((u) => [u.player_id, u]));
  el.innerHTML = `<h2>Giocatori</h2><form class="row" id="f-new-player"><input type="text" name="nickname" placeholder="Nickname" required style="max-width:200px" /><input type="text" name="full_name" placeholder="Nome e cognome (opz.)" style="max-width:260px" /><button class="btn primary">Aggiungi</button></form>
    <div class="table-wrap" style="margin-top:1rem;box-shadow:none"><table><thead><tr><th class="name">Nickname</th><th class="name">Nome</th><th class="name">Account</th><th>Attivo</th><th></th></tr></thead><tbody>
    ${S.players.map((p) => `<tr data-id="${p.id}"><td class="name"><input type="text" value="${esc(p.nickname)}" data-f="nickname" style="min-width:120px" /></td><td class="name"><input type="text" value="${esc(p.full_name || "")}" data-f="full_name" style="min-width:160px" /></td><td class="name small">${account[p.id] ? `${esc(account[p.id].email || "")}${account[p.id].status === "approved" ? "" : ' <span class="chip warn mini">in attesa</span>'}` : '<span class="muted">—</span>'}</td><td><input type="checkbox" ${p.active ? "checked" : ""} data-f="active" /></td><td><button class="btn sm" data-save>Salva</button></td></tr>`).join("")}</tbody></table></div>`;
  $("#f-new-player").onsubmit = (e) => { e.preventDefault(); guard(async () => { await api.upsertPlayer({ nickname: e.target.nickname.value.trim(), full_name: e.target.full_name.value.trim() || null }); toast("Giocatore aggiunto"); renderAdminPlayers(); }); };
  el.querySelectorAll("[data-save]").forEach((b) => b.onclick = () => guard(async () => {
    const tr = b.closest("tr");
    await api.upsertPlayer({ id: tr.dataset.id, nickname: tr.querySelector('[data-f="nickname"]').value.trim(), full_name: tr.querySelector('[data-f="full_name"]').value.trim() || null, active: tr.querySelector('[data-f="active"]').checked });
    toast("Salvato"); renderAdminPlayers();
  }));
}

// ---- admin: utenti e richieste di registrazione
async function renderAdminUsers() {
  const el = $("#adm-users"); if (!el) return;
  S.players = await api.getPlayers(); S.pmap = new Map(S.players.map((p) => [p.id, p]));
  const profiles = await api.getProfiles();
  const roles = ["player", "coach", "scorekeeper", "admin"];
  const roleOpts = (sel) => roles.map((r) => `<option value="${r}" ${r === sel ? "selected" : ""}>${ROLE_LABEL[r]}</option>`).join("");
  const playerOpts = (sel) => `<option value="">— nessuno —</option>` + S.players.map((p) => `<option value="${p.id}" ${p.id === sel ? "selected" : ""}>${esc(p.nickname)}</option>`).join("");
  const linkedTo = Object.fromEntries(profiles.filter((p) => p.player_id).map((p) => [p.player_id, p]));
  const byNick = (n) => S.players.find((p) => p.nickname.toLowerCase() === (n || "").trim().toLowerCase());
  const pending = profiles.filter((p) => p.status === "pending"), approved = profiles.filter((p) => p.status === "approved"), rejected = profiles.filter((p) => p.status === "rejected");
  const when = (d) => d ? new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "short" }) : "";

  // cosa succede accettando: collegamento a un giocatore esistente o creazione
  const outcome = (p) => {
    const pl = byNick(p.requested_nickname);
    if (!p.requested_nickname) return `<span class="chip bad">senza nickname</span>`;
    if (!pl) return `<span class="chip info">nuovo giocatore</span>`;
    const other = linkedTo[pl.id];
    return other && other.id !== p.id ? `<span class="chip bad">${esc(pl.nickname)} è già di ${esc(other.email)}</span>` : `<span class="chip ok">collega a ${esc(pl.nickname)}</span>`;
  };
  const reqCard = (p, isRejected) => `<div class="req" data-id="${p.id}">
      <div class="req-main"><b>${esc(p.requested_nickname || "—")}</b> <span class="muted">${esc(p.requested_full_name || "")}</span>
        <div class="small muted">${esc(p.email || "")} · ${when(p.created_at)}</div><div style="margin-top:.3rem">${outcome(p)}</div></div>
      <div class="req-act"><select data-f="role" aria-label="Ruolo">${roleOpts("player")}</select>
        <button class="btn sm primary" data-ok>Accetta</button>${isRejected ? `<button class="btn sm danger" data-del>Elimina</button>` : `<button class="btn sm danger" data-no>Rifiuta</button>`}</div></div>`;

  el.innerHTML = `<h2>Richieste di registrazione ${pending.length ? `<span class="badge">${pending.length}</span>` : ""}</h2>
    <p class="small muted">Accettando, l'utente viene collegato al giocatore con lo stesso nickname; se il nickname non esiste il giocatore viene creato.</p>
    ${pending.map((p) => reqCard(p, false)).join("") || '<p class="muted">Nessuna richiesta in attesa.</p>'}
    <h2 style="margin-top:1.5rem">Utenti registrati</h2>
    <div class="users">${approved.map((p) => `<div class="req" data-id="${p.id}">
      <div class="req-main"><b>${esc(p.email || "")}</b>${p.id === S.user.id ? ' <span class="chip">tu</span>' : ""}<div class="small muted">dal ${when(p.created_at)}</div></div>
      <div class="req-act"><select data-f="player_id" aria-label="Giocatore">${playerOpts(p.player_id)}</select><select data-f="role" aria-label="Ruolo">${roleOpts(p.role)}</select>
        <button class="btn sm" data-save>Salva</button>${p.id === S.user.id ? "" : '<button class="btn sm danger" data-del>Elimina</button>'}</div></div>`).join("")}</div>
    ${rejected.length ? `<h2 style="margin-top:1.5rem">Rifiutati</h2>${rejected.map((p) => reqCard(p, true)).join("")}` : ""}`;

  const row = (b) => b.closest(".req");
  el.querySelectorAll("[data-ok]").forEach((b) => b.onclick = () => guard(async () => {
    const r = row(b); await api.approveRegistration(r.dataset.id, r.querySelector('[data-f="role"]').value);
    toast("Registrazione accettata"); renderAdminUsers();
  }));
  el.querySelectorAll("[data-no]").forEach((b) => b.onclick = () => guard(async () => {
    if (!confirm("Rifiutare questa registrazione?")) return;
    await api.rejectRegistration(row(b).dataset.id); toast("Registrazione rifiutata"); renderAdminUsers();
  }));
  el.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => guard(async () => {
    if (!confirm("Eliminare definitivamente questo account? Il giocatore e le sue statistiche restano.")) return;
    await api.deleteUser(row(b).dataset.id); toast("Utente eliminato"); renderAdminUsers();
  }));
  el.querySelectorAll("[data-save]").forEach((b) => b.onclick = () => guard(async () => {
    const r = row(b);
    await api.updateProfile(r.dataset.id, { player_id: r.querySelector('[data-f="player_id"]').value || null, role: r.querySelector('[data-f="role"]').value }); toast("Salvato"); renderAdminUsers();
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

// ---- admin: etichette degli assi del radar
function renderAdminRadar() {
  const el = $("#adm-radar"); if (!el) return;
  const sample = { lancio: 4, ricezione: 3, taglio: 5, difesa: 2, velocita: 4, resistenza: 3 };
  const cur = () => Object.fromEntries(Object.keys(SKILL_DEFAULTS).map((k) => [k, $(`#rl-${k}`).value.trim()]));
  el.innerHTML = `<h2>Etichette del radar</h2><p class="small muted">I nomi dei sei assi del radar nella scheda di ogni giocatore. Lascia vuoto per usare il nome predefinito. I valori già assegnati restano legati alla posizione dell'asse.</p>
    <div class="skills-body radar-admin"><div id="radar-prev">${radarSvg(sample)}</div>
      <div>${Object.entries(SKILL_DEFAULTS).map(([k, d], i) => `<label for="rl-${k}">Asse ${i + 1} <span class="muted">(predefinito: ${esc(d)})</span></label><input type="text" id="rl-${k}" maxlength="30" placeholder="${esc(d)}" value="${esc((S.settings.skill_labels?.[k] || "").trim())}" />`).join("")}
        <div class="row" style="margin-top:.8rem"><button class="btn primary" id="rl-save">Salva etichette</button><button class="btn" id="rl-reset" type="button">Ripristina predefinite</button></div></div></div>`;
  const preview = () => { $("#radar-prev").innerHTML = radarSvg(sample, cur()); fitRadar("#radar-prev svg"); };
  setTimeout(() => { fitRadar("#radar-prev svg"); document.fonts?.ready.then(() => fitRadar("#radar-prev svg")); });
  el.querySelectorAll("input").forEach((i) => i.oninput = preview);
  $("#rl-reset").onclick = () => { el.querySelectorAll("input").forEach((i) => i.value = ""); preview(); };
  $("#rl-save").onclick = () => guard(async () => {
    const labels = Object.fromEntries(Object.entries(cur()).filter(([, v]) => v));
    await api.saveSetting("skill_labels", labels);
    S.settings = await api.getSettings(); toast("Etichette salvate");
  });
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
  const later = laterFor();
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

  later(() => {
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

// ============================================================== SQUADRE EQUILIBRATE
// 1) si segnano i presenti, 2) l'algoritmo propone due squadre equilibrate sui sei assi e diverse
// dalle ultime partite, 3) si possono spostare giocatori o rigenerare, 4) si salva come tabellino.
async function viewTeamMaker() {
  const later = laterFor();
  if (!canScore()) { location.hash = "#/login"; return ""; }
  const players = S.players.filter((p) => p.active);
  const skillsBy = Object.fromEntries((await api.getSkillsFor(players.map((p) => p.id))).map((x) => [x.player_id, x]));
  const present = new Set();
  let teams = null;                        // { bianca: [ids], nera: [ids], again, both }
  const seen = [];                         // divisioni già proposte: "rigenera" non le ripropone
  let history = null;                      // ultime partite (caricate al primo "crea squadre")
  const byNick = (a, b) => nick(a).localeCompare(nick(b), "it");

  // ultime partite giocate fino alla data scelta, la più recente per prima
  const loadHistory = async (date) => {
    const ms = [];
    for (const s of [...S.seasons].sort((a, b) => b.starts_on.localeCompare(a.starts_on))) {
      ms.push(...(await api.getMatches(s.id)).filter((m) => m.played_on <= date));
      if (ms.length >= 6) break;
    }
    const last = ms.sort((a, b) => b.played_on.localeCompare(a.played_on) || String(b.created_at || "").localeCompare(String(a.created_at || ""))).slice(0, 6);
    const mps = await api.getMatchPlayers(last.map((m) => m.id));
    return last.map((m) => ({ bianca: mps.filter((x) => x.match_id === m.id && x.team === "bianca").map((x) => x.player_id),
                              nera: mps.filter((x) => x.match_id === m.id && x.team === "nera").map((x) => x.player_id) }));
  };

  const renderPool = () => {
    const q = $("#tm-q").value.trim().toLowerCase();
    if (!$("#tm-pool")) return;          // nel frattempo l'utente è andato altrove
    $("#tm-pool").innerHTML = players.filter((p) => !q || p.nickname.toLowerCase().includes(q))
      .map((p) => `<button type="button" class="pick ${present.has(p.id) ? "on" : ""}" data-p="${p.id}" aria-pressed="${present.has(p.id)}">${esc(p.nickname)}${skillsBy[p.id] ? "" : ' <span class="chip mini" title="Caratteristiche non ancora valutate">nv</span>'}</button>`).join("")
      || `<span class="muted small">Nessun giocatore trovato</span>`;
    const n = present.size, unrated = [...present].filter((id) => !skillsBy[id]).length;
    $("#tm-sum").innerHTML = `<b>${n}</b> present${n === 1 ? "e" : "i"}${unrated ? ` · <span class="warn">${unrated} non valutat${unrated === 1 ? "o" : "i"}</span>` : ""}`;
    $("#tm-make").disabled = n < 4;
  };

  const renderTeams = () => {
    const box = $("#tm-result");
    $("#tm-make").innerHTML = teams ? "🎲 Rigenera" : "🎲 Crea squadre";
    $("#tm-save").style.display = teams ? "" : "none";
    if (!teams) { box.innerHTML = ""; return; }
    const { stats } = teamStats(teams.bianca, teams.nera, skillsBy);
    const keys = Object.keys(SKILL_DEFAULTS);
    const f1 = (x) => x.toFixed(1);
    const diffChip = (d, big) => `<span class="chip ${Math.abs(d) <= big / 2 ? "ok" : Math.abs(d) <= big ? "warn" : "bad"}">${d > 0 ? "+" : ""}${f1(d)}</span>`;
    const board = (t) => `<div class="board ${t}"><h4>Squadra ${t === "bianca" ? "Bianca" : "Nera"} <span class="n">${teams[t].length}</span></h4>
      <div class="list">${[...teams[t]].sort(byNick).map((id) => `<button type="button" class="tag" data-mv="${id}" title="Sposta nell'altra squadra">${esc(nick(id))}${skillsBy[id] ? "" : " <small>nv</small>"}<span aria-hidden="true">⇄</span></button>`).join("")}</div></div>`;
    box.innerHTML = `<h2 style="margin:1.4rem 0 .6rem">Squadre proposte</h2>
      <p class="small muted" style="margin:0 0 .6rem">Tocca un giocatore per spostarlo nell'altra squadra. Le medie si aggiornano subito.</p>
      <div class="boards">${board("bianca")}${board("nera")}</div>
      <div class="card" style="margin-top:.8rem"><h2>Equilibrio</h2>
        <div class="table-wrap" style="border:0"><table><thead><tr><th class="name">Media</th><th>Bianca</th><th>Nera</th><th>Diff.</th></tr></thead><tbody>
        ${keys.map((k) => `<tr><td class="name">${esc(skillLabel(k))}</td><td>${f1(stats.bianca[k])}</td><td>${f1(stats.nera[k])}</td><td>${diffChip(stats.bianca[k] - stats.nera[k], 0.5)}</td></tr>`).join("")}
        <tr><td class="name">Valore generale</td><td><b>${f1(stats.bianca.total)}</b></td><td><b>${f1(stats.nera.total)}</b></td><td>${diffChip(stats.bianca.total - stats.nera.total, 1)}</td></tr>
        </tbody></table></div>
        <p class="small muted" style="margin:.6rem 0 0">Medie sui soli giocatori valutati (Bianca ${stats.bianca.rated}/${stats.bianca.size}, Nera ${stats.nera.rated}/${stats.nera.size}).
        ${teams.both ? `Coppie di compagni già insieme nell'ultima partita: <b>${teams.again}</b> su ${teams.both}.` : ""}</p></div>
      <div class="grid cols-2 team-sk-grid" style="margin:.8rem 0">${teamSkillsCard("bianca", teams.bianca, skillsBy)}${teamSkillsCard("nera", teams.nera, skillsBy)}</div>`;
    ["bianca", "nera"].forEach((t) => { fitRadar(`#radar-${t} svg`); document.fonts?.ready.then(() => fitRadar(`#radar-${t} svg`)); });
  };

  const make = () => guard(async () => {
    const btn = $("#tm-make"); btn.disabled = true;
    try {
      history ||= await loadHistory($("#tm-date").value);
      if (!$("#tm-result")) return;
      const t = makeTeams([...present], skillsBy, history, { avoid: seen });
      seen.push(t.key);
      const last = teamStats(t.bianca, t.nera, skillsBy, history[0]);
      teams = { bianca: t.bianca, nera: t.nera, again: last.again, both: last.both };
      renderTeams();
      if (seen.length === 1) $("#tm-result").scrollIntoView({ behavior: "smooth", block: "start" });
    } finally { renderPool(); }
  });

  later(() => {
    $("#tm-pool").addEventListener("click", (e) => {
      const b = e.target.closest("[data-p]"); if (!b) return;
      present.has(b.dataset.p) ? present.delete(b.dataset.p) : present.add(b.dataset.p);
      if (navigator.vibrate) navigator.vibrate(8);
      teams = null; seen.length = 0; renderTeams(); renderPool();      // presenti cambiati: le squadre vanno rifatte
    });
    $("#tm-q").oninput = renderPool;
    $("#tm-date").onchange = () => { history = null; };
    $("#tm-none").onclick = () => { present.clear(); teams = null; seen.length = 0; renderTeams(); renderPool(); };
    $("#tm-make").onclick = make;
    $("#tm-result").addEventListener("click", (e) => {
      const mv = e.target.closest("[data-mv]"); if (!mv) return;
      const id = mv.dataset.mv, from = teams.bianca.includes(id) ? "bianca" : "nera", to = from === "bianca" ? "nera" : "bianca";
      teams[from] = teams[from].filter((x) => x !== id); teams[to] = [...teams[to], id];
      const last = teamStats(teams.bianca, teams.nera, skillsBy, history?.[0]);
      Object.assign(teams, { again: last.again, both: last.both });
      renderTeams();
    });
    $("#tm-save").onclick = () => guard(async () => {
      if (teams.bianca.length < 2 || teams.nera.length < 2) throw new Error("Servono almeno 2 giocatori per squadra");
      const btn = $("#tm-save"); btn.disabled = true;
      try {
        const id = await api.saveMatch({ seasonId: $("#tm-season").value, playedOn: $("#tm-date").value, result: null, bianca: teams.bianca, nera: teams.nera, notes: "" });
        toast("Tabellino salvato: risultato e squadre si modificano da «Modifica»"); location.hash = "#/partita/" + id;
      } finally { btn.disabled = false; }
    });
    renderPool();
  });

  const seasonId = currentSeason()?.id;
  return `<div class="page-head"><div class="grow"><h3>Partite</h3><h1>Crea squadre</h1></div></div>
    <div class="card">
      <p class="small muted" style="margin-top:0">Segna chi è presente e premi <b>Crea squadre</b>: le squadre vengono divise in modo equilibrato su tutti gli assi delle caratteristiche
        e, a parità di equilibrio, evitando di rimettere insieme i compagni delle ultime partite. Chi non è ancora valutato (<span class="chip mini">nv</span>) conta come un giocatore medio e viene distribuito tra le due squadre.</p>
      <div class="grid cols-2 tight">
        <div><label>Stagione</label><select id="tm-season">${S.seasons.map((s) => `<option value="${s.id}" ${s.id === seasonId ? "selected" : ""}>${esc(s.name)}${s.is_current ? " · in corso" : ""}</option>`).join("")}</select></div>
        <div><label>Data</label><input type="date" id="tm-date" value="${today()}" required /></div>
      </div>
    </div>
    <div class="card">
      <div class="row" style="justify-content:space-between"><h2 style="margin:0">Presenti</h2><button type="button" class="linklike small" id="tm-none" style="padding:0">Deseleziona tutti</button></div>
      <input type="search" id="tm-q" placeholder="Cerca…" autocomplete="off" style="margin:.6rem 0" />
      <div class="pick-grid" id="tm-pool"></div>
    </div>
    <div id="tm-result"></div>
    <div class="savebar"><div id="tm-sum" class="small"></div><a class="btn hide-sm" href="#/partite">Annulla</a><button type="button" class="btn" id="tm-make" disabled>🎲 Crea squadre</button><button type="button" class="btn primary" id="tm-save" style="display:none">Salva</button></div>`;
}

// ============================================================== VOTA
async function viewVote(matchId) {
  const later = laterFor();
  if (!myPlayer()) { location.hash = "#/area"; return ""; }
  let m = null;
  for (const s of S.seasons) { const ms = await api.getMatches(s.id); m = ms.find((x) => x.id === matchId); if (m) break; }
  if (!m) return `<div class="empty">Partita non trovata.</div>`;
  const [mps, mine] = await Promise.all([api.getMatchPlayers([matchId]), api.getMyRatings(matchId)]);
  const me = myPlayer();
  if (!mps.some((p) => p.player_id === me)) return `<div class="card"><h2>Non hai giocato questa partita</h2><p class="muted">Puoi votare solo le partite in cui sei stato in campo.</p></div>`;
  if (!m.voting_open) return `<div class="card"><h2>Votazioni chiuse</h2><p class="muted">Si poteva votare fino a ${fmtDate(lastVoteDay(m))}. L'MVP è stato assegnato a chi ha la media più alta.</p></div>`;
  const myTeam = mps.find((p) => p.player_id === me).team;
  const otherTeam = myTeam === "bianca" ? "nera" : "bianca";
  const TEAM = { bianca: "Bianca", nera: "Nera" };
  const prev = Object.fromEntries(mine.map((r) => [r.rated_id, r]));
  // voto corrente per giocatore: parte dai voti già dati, nessun voto di default
  const score = Object.fromEntries(mine.map((r) => [r.rated_id, r.score]));
  const others = mps.filter((p) => p.player_id !== me).map((p) => ({ ...p, nickname: nick(p.player_id) }));
  const byTeam = (t) => others.filter((p) => p.team === t).sort((a, b) => a.nickname.localeCompare(b.nickname, "it"));

  const refresh = () => {
    for (const t of ["bianca", "nera"]) {
      const list = byTeam(t), n = list.filter((p) => score[p.player_id]).length;
      const el = $(`#vt-${t}`); if (el) el.textContent = `${n}/${list.length}`;
    }
    const tot = Object.keys(score).length;
    $("#vote-sum").innerHTML = `Votati <b>${tot}</b> di ${others.length}`;
  };

  later(() => {
    const f = $("#f-vote");
    f.addEventListener("click", (e) => {
      const b = e.target.closest("[data-score]"), c = e.target.closest("[data-cmt]");
      if (b) {
        const card = b.closest(".vote-card"), id = card.dataset.id, v = Number(b.dataset.score);
        if (score[id] === v) delete score[id]; else score[id] = v;          // ritoccare lo stesso numero toglie il voto
        card.querySelectorAll("[data-score]").forEach((x) => x.classList.toggle("active", Number(x.dataset.score) === score[id]));
        card.classList.toggle("voted", !!score[id]);
        card.querySelector(".vc-val").textContent = score[id] ?? "–";
        refresh();
      } else if (c) {
        const box = c.closest(".vote-card").querySelector(".vc-cmt");
        box.classList.toggle("hidden"); if (!box.classList.contains("hidden")) box.querySelector("textarea").focus();
      }
    });
    refresh();
    f.onsubmit = (e) => { e.preventDefault(); guard(async () => {
      const rows = [], removed = [];
      for (const card of f.querySelectorAll(".vote-card")) {
        const id = card.dataset.id, cmt = card.querySelector("textarea").value.trim();
        if (score[id]) rows.push({ match_id: matchId, rater_id: me, rated_id: id, score: score[id], comment: cmt || null });
        else if (cmt) throw new Error(`Dai un voto a ${nick(id)} per lasciare il commento`);
        else if (prev[id]) removed.push(prev[id].id);
      }
      if (!rows.length && !removed.length) throw new Error("Tocca un numero per votare almeno un giocatore");
      const btn = $("#vote-save"); btn.disabled = true;
      try {
        if (rows.length) await api.upsertRatings(rows);
        for (const rid of removed) await api.deleteRating(rid);
      } finally { btn.disabled = false; }
      toast(`${rows.length === 1 ? "Salvato 1 voto" : `Salvati ${rows.length} voti`}${removed.length ? `, ${removed.length} ${removed.length === 1 ? "tolto" : "tolti"}` : ""}. Grazie!`); location.hash = "#/partita/" + matchId;
    }); };
  });

  const card = (p) => { const r = prev[p.player_id], v = score[p.player_id]; return `<div class="vote-card ${v ? "voted" : ""}" data-id="${p.player_id}">
      <div class="vc-head">${avatar(p.nickname)}<span class="vc-name">${esc(p.nickname)}</span><span class="vc-val" aria-live="polite">${v ?? "–"}</span></div>
      <div class="vc-scores" role="radiogroup" aria-label="Voto a ${esc(p.nickname)}">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<button type="button" data-score="${n}" class="${v === n ? "active" : ""}" aria-label="${n}">${n}</button>`).join("")}</div>
      <button type="button" class="linklike small" data-cmt>💬 ${r?.comment ? "Modifica commento" : "Aggiungi un commento"}</button>
      <div class="vc-cmt ${r?.comment ? "" : "hidden"}"><textarea placeholder="Commento (facoltativo, firmato con il tuo nickname)" maxlength="300">${esc(r?.comment || "")}</textarea></div></div>`; };
  const section = (t, title) => { const list = byTeam(t); return list.length ? `<section class="vote-team ${t}">
      <h2 class="vt-head"><span>${title} <small>Squadra ${TEAM[t]}</small></span><span class="chip" id="vt-${t}"></span></h2>
      <div class="vote-grid">${list.map(card).join("")}</div></section>` : ""; };

  return `<div class="page-head"><div class="grow"><h3>Vota i compagni</h3><h1>${fmtDate(m.played_on)}</h1>
      <p class="muted small">Tocca un voto da 1 a 10 (ritoccalo per toglierlo): chi non tocchi non riceve voti. I voti sono anonimi, i commenti invece sono firmati con il tuo nickname. Puoi modificarli fino a ${fmtDate(lastVoteDay(m))}.</p></div></div>
    <form id="f-vote" class="vote-form">
      ${section(myTeam, "La tua squadra")}
      ${section(otherTeam, "Avversari")}
      <div class="savebar"><div id="vote-sum" class="small"></div><a class="btn" href="#/partita/${matchId}">Annulla</a><button class="btn primary" type="submit" id="vote-save">Salva</button></div>
    </form>`;
}

boot().catch((e) => { console.error(e); $("#app").innerHTML = `<div class="card"><h2>Errore di avvio</h2><p class="muted">${esc(e.message)}</p></div>`; });
