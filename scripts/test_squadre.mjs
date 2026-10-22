// Test dell'algoritmo delle squadre equilibrate (docs/squadre.js).
// Uso (da coppa-impegno-costante/):  node scripts/test_squadre.mjs
// Facoltativo: node scripts/test_squadre.mjs dati.json  con { player_skills: [...], partite: [{ bianca: [...], nera: [...] }] }
// (dati veri, la partita più recente per prima) per vedere i numeri su un caso reale.
import { readFileSync } from "node:fs";
import { makeTeams, splitKey, teamStats, AXES } from "../docs/squadre.js";

let passed = 0; const problems = [];
const ok = (cond, label) => { if (cond) passed++; else problems.push(label); };

// generatore deterministico (mulberry32): test ripetibili
const seeded = (s) => () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ids = (n) => Array.from({ length: n }, (_, i) => `p${String(i).padStart(2, "0")}`);
const fakeSkills = (list, rng, unratedEvery = 0) => Object.fromEntries(list.filter((_, i) => !unratedEvery || i % unratedEvery !== unratedEvery - 1)
  .map((id) => [id, Object.fromEntries(AXES.map((k) => [k, Math.floor(rng() * 6)]))]));
// differenze tra le medie (sui valutati)
const diffs = (t) => { const { bianca: b, nera: n } = t.stats; return { axis: Math.max(...AXES.map((k) => Math.abs(b[k] - n[k]))), total: Math.abs(b.total - n.total) }; };
const randomSplit = (list, rng) => { const a = [...list].sort(() => rng() - 0.5); const h = Math.floor(a.length / 2); return { bianca: a.slice(0, h), nera: a.slice(h) }; };

// 1. divisione corretta: tutti presenti una volta sola, squadre di dimensioni n/2 (±1)
for (const n of [2, 3, 5, 8, 13, 16, 21, 30]) {
  for (const unr of [0, 3, 1]) {          // tutti valutati, 1 su 3 non valutato, nessuno valutato (1 → tutti non valutati)
    const list = ids(n), rng = seeded(n * 10 + unr);
    const sk = unr === 1 ? {} : fakeSkills(list, rng, unr);
    const t = makeTeams(list, sk, [], { rng });
    const all = [...t.bianca, ...t.nera];
    ok(all.length === n && new Set(all).size === n && list.every((id) => all.includes(id)), `n=${n} unr=${unr}: divisione non valida`);
    ok(Math.abs(t.bianca.length - t.nera.length) <= 1, `n=${n} unr=${unr}: squadre sbilanciate nel numero (${t.bianca.length} vs ${t.nera.length})`);
    ok(Number.isFinite(t.balance) && Number.isFinite(t.repeat), `n=${n} unr=${unr}: costo non numerico`);
  }
}
let threw = false; try { makeTeams(["solo"], {}); } catch { threw = true; }
ok(threw, "1 giocatore: deve dare errore");

// 2. equilibrio: molto meglio di una divisione a caso, e vicino all'ottimo esatto
{
  let algo = { axis: 0, total: 0 }, rand = { axis: 0, total: 0 }, worstTotal = 0, worstAxis = 0;
  const N = 40;
  for (let s = 0; s < N; s++) {
    const rng = seeded(1000 + s), list = ids(12 + (s % 9)), sk = fakeSkills(list, rng);
    const a = diffs(makeTeams(list, sk, [], { rng })), r = diffs(teamStats(...Object.values(randomSplit(list, rng)), sk));
    algo.axis += a.axis / N; algo.total += a.total / N; rand.axis += r.axis / N; rand.total += r.total / N;
    worstTotal = Math.max(worstTotal, a.total); worstAxis = Math.max(worstAxis, a.axis);
  }
  console.log(`equilibrio (12–20 giocatori, 40 casi): asse peggiore ${algo.axis.toFixed(2)} vs ${rand.axis.toFixed(2)} a caso · valore generale ${algo.total.toFixed(2)} vs ${rand.total.toFixed(2)} a caso · casi peggiori: asse ${worstAxis.toFixed(2)}, totale ${worstTotal.toFixed(2)}`);
  ok(algo.axis < rand.axis / 3, `equilibrio per asse insufficiente (${algo.axis.toFixed(2)} vs ${rand.axis.toFixed(2)})`);
  ok(algo.total < rand.total / 5, `equilibrio del valore generale insufficiente (${algo.total.toFixed(2)} vs ${rand.total.toFixed(2)})`);
  ok(worstAxis <= 1 && worstTotal <= 1, `caso peggiore troppo sbilanciato (asse ${worstAxis.toFixed(2)}, totale ${worstTotal.toFixed(2)})`);
}
// confronto con l'ottimo esatto (tutte le divisioni) fino a 14 giocatori, senza storico
for (const [n, seed] of [[10, 7], [12, 8], [13, 9], [14, 10], [12, 1000]]) {
  const list = ids(n), rng = seeded(seed), sk = fakeSkills(list, rng);
  const t = makeTeams(list, sk, [], { rng });
  let best = Infinity;
  for (let mask = 0; mask < 1 << n; mask++) {
    if (popcount(mask) !== Math.floor(n / 2)) continue;
    const A = list.filter((_, i) => mask & (1 << i)), B = list.filter((_, i) => !(mask & (1 << i)));
    const { stats: { bianca: x, nera: y } } = teamStats(A, B, sk);
    let bal = 0, tot = 0; for (const k of AXES) { const d = x[k] - y[k]; bal += d * d; tot += d; }
    best = Math.min(best, bal + 0.5 * tot * tot);
  }
  console.log(`ottimo esatto ${n} giocatori: ${best.toFixed(3)} · algoritmo: ${t.balance.toFixed(3)}`);
  ok(t.balance <= best + 0.02 + best * 0.15 + 1e-9, `${n} giocatori: lontano dall'ottimo esatto (${t.balance.toFixed(3)} vs ${best.toFixed(3)})`);
}
function popcount(x) { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; }

// 3. varietà: stagione simulata con gli stessi 16 giocatori, con e senza memoria delle partite precedenti
{
  const list = ids(16), sk = fakeSkills(list, seeded(99));
  const run = (useHistory) => {
    const rng = seeded(5), hist = [], together = {}; let again = 0, both = 0, worst = 0, identical = 0;
    for (let g = 0; g < 20; g++) {
      const t = makeTeams(list, sk, useHistory ? hist : [], { rng });
      const st = teamStats(t.bianca, t.nera, sk, hist[0]);
      again += st.again; both += st.both; worst = Math.max(worst, diffs(t).total);
      if (hist[0] && splitKey(hist[0].bianca, hist[0].nera) === t.key) identical++;
      for (const team of [t.bianca, t.nera]) for (const x of team) for (const y of team) if (x < y) together[x + y] = (together[x + y] || 0) + 1;
      hist.unshift({ bianca: t.bianca, nera: t.nera });
    }
    // quante volte ogni coppia è finita insieme: con squadre sempre diverse i conteggi sono simili tra loro
    const counts = list.flatMap((x, i) => list.slice(i + 1).map((y) => together[x + y] || 0));
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const sd = Math.sqrt(counts.reduce((a, b) => a + (b - mean) ** 2, 0) / counts.length);
    return { rate: again / both, worst, identical, sd };
  };
  const off = run(false), on = run(true);
  console.log(`varietà (20 partite, 16 giocatori): coppie già compagne nella partita prima ${(on.rate * 100).toFixed(0)}% con memoria vs ${(off.rate * 100).toFixed(0)}% senza (minimo possibile ≈ 43%, a caso ≈ 47%) · dispersione delle coppie ${on.sd.toFixed(2)} (senza memoria ${off.sd.toFixed(2)}, a caso ≈ 2.2) · valore generale peggiore ${on.worst.toFixed(2)}`);
  ok(on.identical === 0, `con la memoria la stessa divisione si ripete subito (${on.identical} volte)`);
  ok(on.rate <= 0.5 && on.rate < off.rate - 0.2, `con la memoria le coppie si ripetono troppo (${(on.rate * 100).toFixed(0)}%)`);
  ok(on.sd < 4 && on.sd < off.sd / 2, `alcune coppie finiscono insieme troppo spesso (dispersione ${on.sd.toFixed(2)})`);
  ok(on.worst <= 1, `la varietà rovina l'equilibrio (${on.worst.toFixed(2)})`);
}

// 4. "rigenera": con le divisioni già viste da evitare, la proposta cambia; e il seed cambia la proposta
{
  const list = ids(14), sk = fakeSkills(list, seeded(3)), rng = seeded(11);
  const seen = []; let distinct = 0;
  for (let i = 0; i < 6; i++) { const t = makeTeams(list, sk, [], { rng, avoid: seen }); if (!seen.includes(t.key)) distinct++; seen.push(t.key); }
  ok(distinct === 6, `rigenera ripropone squadre già viste (${distinct}/6 diverse)`);
  // pochi presenti: anche esaurite le soluzioni migliori, ogni "rigenera" dà una divisione nuova
  const six = ids(6), sk6 = fakeSkills(six, seeded(8)), seen6 = [];
  for (let i = 0; i < 8; i++) seen6.push(makeTeams(six, sk6, [], { rng, avoid: seen6 }).key);
  ok(new Set(seen6).size === 8, `6 giocatori: rigenera ripete (${new Set(seen6).size}/8 diverse)`);
  // mai la stessa divisione dell'ultima partita
  const t1 = makeTeams(six, sk6, [], { rng: seeded(1) }), t2 = makeTeams(six, sk6, [{ bianca: t1.bianca, nera: t1.nera }], { rng: seeded(1) });
  ok(t1.key !== t2.key, "ripropone le stesse squadre dell'ultima partita");
  ok(splitKey(["b", "a"], ["d", "c"]) === splitKey(["c", "d"], ["a", "b"]), "splitKey dipende dai colori o dall'ordine");
}

// 5. tutti uguali o nessuno valutato: si divide comunque (a caso, guidati solo dallo storico)
{
  const list = ids(10);
  const flat = Object.fromEntries(list.map((id) => [id, Object.fromEntries(AXES.map((k) => [k, 3]))]));
  const t = makeTeams(list, flat, [], { rng: seeded(1) });
  ok(t.balance < 1e-9, "giocatori identici: squadre non perfettamente pari");
  const last = { bianca: list.slice(0, 5), nera: list.slice(5) };
  const u = makeTeams(list, {}, [last], { rng: seeded(2) });
  const st = teamStats(u.bianca, u.nera, {}, last);
  ok(st.again < st.both / 2, `nessuno valutato: lo storico non viene usato (${st.again}/${st.both})`);
}
// non valutati distribuiti tra le due squadre
{
  const list = ids(16), rng = seeded(21), sk = fakeSkills(list, rng, 2);   // metà non valutati
  const t = makeTeams(list, sk, [], { rng });
  ok(Math.abs(t.stats.bianca.rated - t.stats.nera.rated) <= 1, `non valutati tutti da una parte (${t.stats.bianca.rated} vs ${t.stats.nera.rated} valutati)`);
}

// 6. tempi: 40 presenti in meno di un secondo
{
  const list = ids(40), rng = seeded(4), sk = fakeSkills(list, rng);
  const hist = Array.from({ length: 4 }, () => randomSplit(list, rng));
  const t0 = performance.now(); makeTeams(list, sk, hist, { rng }); const ms = performance.now() - t0;
  console.log(`40 giocatori con storico: ${ms.toFixed(0)} ms`);
  ok(ms < 1000, `troppo lento (${ms.toFixed(0)} ms)`);
}

// dati reali facoltativi
const file = process.argv[2];
if (file) {
  const d = JSON.parse(readFileSync(file, "utf8"));
  const sk = Object.fromEntries(d.player_skills.map((s) => [s.player_id, s]));
  for (const [i, m] of d.partite.slice(0, 5).entries()) {
    const list = [...m.bianca, ...m.nera], hist = d.partite.slice(i + 1);
    const real = diffs(teamStats(m.bianca, m.nera, sk)), t = makeTeams(list, sk, hist);
    const rs = teamStats(m.bianca, m.nera, sk, hist[0]), ts = teamStats(t.bianca, t.nera, sk, hist[0]);
    console.log(`reale #${i} (${list.length} giocatori, ${list.filter((id) => sk[id]).length} valutati): squadre vere asse ${real.axis.toFixed(2)} totale ${real.total.toFixed(2)} ripetute ${rs.again}/${rs.both} → proposta asse ${diffs(t).axis.toFixed(2)} totale ${diffs(t).total.toFixed(2)} ripetute ${ts.again}/${ts.both}`);
  }
}

console.log(`\nControlli superati: ${passed}`);
if (problems.length) { console.log(`PROBLEMI (${problems.length}):`); problems.forEach((p) => console.log(" -", p)); process.exit(1); }
console.log("Nessun problema trovato.");
