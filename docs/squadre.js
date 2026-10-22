// Squadre equilibrate: divide i presenti in due squadre con medie simili su ogni asse del radar
// e sul valore generale, evitando di rimettere insieme le coppie di compagni delle ultime partite.
// Modulo puro (nessun DOM, nessuna rete): lo usano app.js e scripts/test_squadre.mjs.

export const AXES = ["lancio", "ricezione", "taglio", "difesa", "velocita", "resistenza"];

const W_TOTAL = 0.5;       // peso della differenza di valore generale (oltre ai singoli assi)
const W_UNRATED = 0.5;     // peso dello squilibrio di non valutati (oltre 1 di differenza)
const W_REPEAT = 0.1;      // peso di ogni coppia già compagna di recente (1 = insieme in tutte le ultime partite)
const DECAY = 0.75;        // ogni partita più vecchia pesa il 75% della successiva
const DEPTH = 6;           // partite precedenti considerate

// chiave canonica di una divisione (indipendente da quale squadra sia Bianca o Nera)
export function splitKey(a, b) {
  const [x, y] = [[...a].sort(), [...b].sort()];
  return (x[0] < y[0] ? [x, y] : [y, x]).map((t) => t.join(",")).join("|");
}

// history: ultime partite, la più recente per prima, come [{ bianca: [ids], nera: [ids] }]
// rng: generatore in [0, 1) (iniettabile nei test); avoid: chiavi di divisioni da non riproporre
export function makeTeams(ids, skillsBy = {}, history = [], { rng = Math.random, avoid = [], restarts = 300 } = {}) {
  const n = ids.length;
  if (n < 2) throw new Error("Servono almeno 2 giocatori");
  const idx = new Map(ids.map((id, i) => [id, i]));

  // valori: chi non è valutato vale la media dei valutati presenti (neutro per l'equilibrio)
  const rated = ids.filter((id) => skillsBy[id]);
  const fill = AXES.map((k) => rated.length ? rated.reduce((a, id) => a + (Number(skillsBy[id][k]) || 0), 0) / rated.length : 0);
  const V = ids.map((id) => skillsBy[id] ? AXES.map((k) => Number(skillsBy[id][k]) || 0) : fill);
  const U = ids.map((id) => skillsBy[id] ? 0 : 1);
  const uTot = n - rated.length;

  // memoria delle coppie: quanto spesso (e quanto di recente) due presenti sono stati compagni
  const W = Array.from({ length: n }, () => new Float64Array(n));
  const recent = history.slice(0, DEPTH);
  recent.forEach((h, age) => {
    const w = DECAY ** age;
    for (const team of [h.bianca || [], h.nera || []]) {
      const here = team.map((id) => idx.get(id)).filter((i) => i !== undefined);
      for (const i of here) for (const j of here) if (i !== j) W[i][j] += w;
    }
  });
  const maxW = recent.reduce((a, _, age) => a + DECAY ** age, 0) || 1;
  // al quadrato: una coppia sempre insieme pesa molto più di due coppie insieme ogni tanto
  for (const row of W) for (let j = 0; j < n; j++) row[j] = (row[j] / maxW) ** 2;

  const nA = Math.floor(n / 2), nB = n - nA;
  const pairs = (nA * (nA - 1) + nB * (nB - 1)) / 2 || 1;

  // stato: side[i] = true se in A; somme per asse, non valutati, peso coppie (incrementali)
  const evalState = (sumA, sumB, uA, rep) => {
    let bal = 0, tot = 0;
    for (let k = 0; k < AXES.length; k++) { const d = sumA[k] / nA - sumB[k] / nB; bal += d * d; tot += d; }
    const du = Math.max(0, Math.abs(2 * uA - uTot) - 1);        // non valutati: A ne ha uA, B uTot - uA
    const balance = bal + W_TOTAL * tot * tot + W_UNRATED * du * du;
    return { balance, repeat: rep / pairs, cost: balance + W_REPEAT * rep };
  };

  const fullEval = (side) => {
    const sumA = new Float64Array(AXES.length), sumB = new Float64Array(AXES.length);
    let uA = 0, rep = 0;
    for (let i = 0; i < n; i++) {
      const s = side[i] ? sumA : sumB;
      for (let k = 0; k < AXES.length; k++) s[k] += V[i][k];
      if (side[i]) uA += U[i];
      for (let j = i + 1; j < n; j++) if (side[i] === side[j]) rep += W[i][j];
    }
    return { sumA, sumB, uA, rep, ...evalState(sumA, sumB, uA, rep) };
  };
  const entry = (side, r) => {
    const A = ids.filter((_, i) => side[i]), B = ids.filter((_, i) => !side[i]);
    return { A, B, key: splitKey(A, B), balance: r.balance, repeat: r.repeat, cost: r.cost };
  };

  const solve = () => {
    const order = ids.map((_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    const side = new Array(n).fill(false);
    order.slice(0, nA).forEach((i) => side[i] = true);
    let { sumA, sumB, uA, rep, ...cur } = fullEval(side);
    // scambi a coppia finché migliorano (primo miglioramento, in ordine casuale)
    for (let improved = true; improved;) {
      improved = false;
      const As = order.filter((i) => side[i]), Bs = order.filter((i) => !side[i]);
      for (const a of As) {
        for (const b of Bs) {
          if (!side[a] || side[b]) continue;
          // variazione del peso coppie spostando a in B e b in A
          let dRep = 0;
          for (let x = 0; x < n; x++) {
            if (x === a || x === b) continue;
            if (side[x]) dRep += W[b][x] - W[a][x]; else dRep += W[a][x] - W[b][x];
          }
          for (let k = 0; k < AXES.length; k++) { const d = V[b][k] - V[a][k]; sumA[k] += d; sumB[k] -= d; }
          const nxt = evalState(sumA, sumB, uA + U[b] - U[a], rep + dRep);
          if (nxt.cost < cur.cost - 1e-9) {
            side[a] = false; side[b] = true; uA += U[b] - U[a]; rep += dRep; cur = nxt; improved = true;
          } else {
            for (let k = 0; k < AXES.length; k++) { const d = V[b][k] - V[a][k]; sumA[k] -= d; sumB[k] += d; }
          }
        }
      }
    }
    return { side, ...cur };
  };

  // tante ripartenze casuali: si tengono le divisioni diverse tra loro
  const found = new Map();
  for (let r = 0; r < restarts; r++) {
    const s = solve(), e = entry(s.side, s);
    if (!found.has(e.key)) found.set(e.key, { ...e, side: s.side });
  }
  const sorted = [...found.values()].sort((x, y) => x.cost - y.cost);
  const skip = new Set(avoid);
  if (history[0]) skip.add(splitKey(history[0].bianca || [], history[0].nera || []));   // mai identiche all'ultima partita
  let fresh = sorted.filter((s) => !skip.has(s.key));
  // con pochi presenti le soluzioni migliori possono essere già state tutte proposte:
  // si cercano le divisioni vicine (uno scambio) alle migliori, che non siano da evitare
  if (!fresh.length) {
    const near = new Map();
    for (const s of sorted.slice(0, 5)) {
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
        if (!s.side[a] || s.side[b]) continue;
        const side = [...s.side]; side[a] = false; side[b] = true;
        const e = entry(side, fullEval(side));
        if (!skip.has(e.key) && !near.has(e.key)) near.set(e.key, e);
      }
    }
    fresh = [...near.values()].sort((x, y) => x.cost - y.cost);
  }
  const pool = fresh.length ? fresh : sorted;
  // scelta casuale tra le migliori quasi equivalenti: squadre diverse a ogni "rigenera"
  const best = pool[0].cost;
  const near = pool.filter((s) => s.cost <= best + 0.02 + best * 0.15).slice(0, 8);
  const pick = near[Math.floor(rng() * near.length)];
  // la squadra in più (dispari) e i colori sono a caso
  const [bianca, nera] = rng() < 0.5 ? [pick.A, pick.B] : [pick.B, pick.A];
  return { bianca, nera, key: pick.key, balance: pick.balance, repeat: pick.repeat, ...teamStats(bianca, nera, skillsBy, history[0]) };
}

// medie per asse e valore generale (sui soli valutati), e coppie già compagne nell'ultima partita
export function teamStats(bianca, nera, skillsBy = {}, last = null) {
  const mean = (team) => {
    const r = team.map((id) => skillsBy[id]).filter(Boolean);
    const m = Object.fromEntries(AXES.map((k) => [k, r.length ? r.reduce((a, s) => a + (Number(s[k]) || 0), 0) / r.length : 0]));
    m.total = AXES.reduce((a, k) => a + m[k], 0);
    return { ...m, rated: r.length, size: team.length };
  };
  let again = 0, both = 0;
  if (last) {
    const lastTeam = new Map([...(last.bianca || []).map((id) => [id, "b"]), ...(last.nera || []).map((id) => [id, "n"])]);
    for (const team of [bianca, nera]) {
      for (let i = 0; i < team.length; i++) for (let j = i + 1; j < team.length; j++) {
        const x = lastTeam.get(team[i]), y = lastTeam.get(team[j]);
        if (x && y) { both++; if (x === y) again++; }
      }
    }
  }
  return { stats: { bianca: mean(bianca), nera: mean(nera) }, again, both };
}
