"""Verifica completa del sito prima di pubblicare.

Uso (da coppa-impegno-costante/):
    cd docs && python3 -m http.server 8787 &      # server locale
    python3 scripts/test_sito.py                 # richiede playwright (pip install playwright; playwright install chromium)

Due giri:
  1. REALE: il sito locale collegato al database vero, solo letture (pagine pubbliche).
  2. MOCK:  api.js sostituito da scripts/api-mock.js con latenza simulata (?slow=250) per provare
            tutti i ruoli e tutte le funzioni che scrivono, senza toccare il database.
Su ogni pagina: nessun errore JS/console, nessun "undefined"/"NaN"/"[object", nessuno scroll orizzontale,
nessuna schermata di errore. Esce con codice 1 se qualcosa non va.
"""
import asyncio, re, sys
from playwright.async_api import async_playwright

BASE = "http://localhost:8787/index.html"
MOCK = open("scripts/api-mock.js", encoding="utf-8").read()
SLOW = "250"
BAD_TEXT = re.compile(r"\bundefined\b|\bNaN\b|\[object |\bInvalid Date\b")
problems, passed = [], 0


def ok(cond, label):
    global passed
    if cond: passed += 1
    else: problems.append(label)
    return cond


async def check_page(pg, label):
    """Controlli generici su qualunque pagina."""
    await pg.wait_for_timeout(150)
    txt = await pg.locator("body").inner_text()
    m = BAD_TEXT.search(txt)
    ok(not m, f"{label}: testo sospetto '{m.group(0) if m else ''}' → …{txt[max(0, (m.start() if m else 0) - 40):(m.end() if m else 0) + 20]!r}…")
    ok("Errore di avvio" not in txt and "\nOps\n" not in f"\n{txt}\n", f"{label}: schermata di errore")
    over = await pg.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    ok(over <= 1, f"{label}: scroll orizzontale di {over}px")


async def new_page(b, errs, vp=(390, 844), scheme="dark", mock=False):
    ctx = await b.new_context(viewport={"width": vp[0], "height": vp[1]}, color_scheme=scheme,
                              is_mobile=vp[0] < 800, has_touch=vp[0] < 800)
    if mock:
        await ctx.route("**/api.js*", lambda r: r.fulfill(body=MOCK, content_type="text/javascript"))
    pg = await ctx.new_page()
    pg.set_default_timeout(15000)
    tag = f"{'mock' if mock else 'reale'} {vp[0]}px {scheme}"
    pg.on("pageerror", lambda e: errs.append(f"{tag}: {e}"))
    pg.on("console", lambda m: errs.append(f"{tag}: console {m.text}") if m.type == "error" else None)
    pg.on("dialog", lambda d: asyncio.ensure_future(d.accept()))
    return pg


async def settle(pg):
    """Aspetta che la pagina abbia finito di caricare (niente 'Caricamento…')."""
    await pg.wait_for_timeout(120)
    try:
        await pg.wait_for_function("!(document.querySelector('#app')?.innerText || '').startsWith('Caricamento')", timeout=25000)
    except Exception:
        txt = (await pg.locator("#app").inner_text())[:120].replace("\n", " | ")
        raise RuntimeError(f"pagina ferma su {pg.url.split('#')[-1]} ({pg.url.split('?')[-1].split('#')[0]}): {txt}")
    await pg.wait_for_timeout(250)


async def go(pg, url, wait=None):
    await pg.goto(url)
    await settle(pg)


# ---------------------------------------------------------------- 1. sito reale, solo lettura
async def giro_reale(b, errs):
    for vp, scheme in [((390, 844), "dark"), ((390, 844), "light"), ((360, 740), "dark"), ((1280, 900), "light")]:
        pg = await new_page(b, errs, vp, scheme)
        try:
            await _giro_reale_vp(pg, vp, scheme)
        except Exception as e:
            txt = (await pg.locator("#app").inner_text())[:200].replace("\n", " | ")
            problems.append(f"reale {vp[0]} {scheme}: interrotto su {pg.url.split('#')[-1]} → {str(e).splitlines()[0]} · pagina: {txt}")
        await pg.context.close()


async def _giro_reale_vp(pg, vp, scheme):
    if True:
        L = f"reale {vp[0]} {scheme}"
        await go(pg, BASE + "#/", 1800)
        ok(await pg.locator(".tabs.seg a.active").count() == 1, f"{L}: schede In corso/Storico")
        await check_page(pg, f"{L} classifica")
        for t in ["eff", "mvp", "pts"]:
            await pg.click(f'#tabs button[data-t="{t}"]'); await check_page(pg, f"{L} classifica/{t}")
        await go(pg, BASE + "#/storico", 1500)
        pills = await pg.locator(".season-pills .pill").count()
        ok(pills >= 1, f"{L}: stagioni nello storico")
        for i in range(pills):
            await pg.locator(".season-pills .pill").nth(i).click(); await settle(pg)
            for t in ["pts", "eff", "mvp"]:
                await pg.click(f'#tabs button[data-t="{t}"]'); await check_page(pg, f"{L} storico#{i}/{t}")
        await go(pg, BASE + "#/partite", 1500); await check_page(pg, f"{L} partite")
        seasons = await pg.locator("select[data-season] option").count()
        for i in range(seasons):
            await pg.locator("select[data-season]").select_option(index=i); await settle(pg)
            await check_page(pg, f"{L} partite stagione#{i}")
            n = await pg.locator(".match-card").count()
            for j in sorted({0, n // 2, n - 1}) if n else []:
                await pg.locator(".match-card").nth(j).click(); await settle(pg)
                await check_page(pg, f"{L} partita s{i}#{j}")
                ok(await pg.locator(".team-sk").count() == 2, f"{L}: due card caratteristiche di squadra (s{i}#{j})")
                for card in await pg.locator(".team-sk .sk-total b").all_text_contents():
                    ok(re.fullmatch(r"\d{1,2}\.\d", card) is not None, f"{L}: valore medio squadra con un decimale ({card})")
                ok(await pg.locator(".cmt-del").count() == 0, f"{L}: cestino commenti visibile senza accesso")
                await go(pg, BASE + "#/partite", 1200)
                await pg.wait_for_selector("select[data-season]")
                await pg.locator("select[data-season]").select_option(index=i); await settle(pg)
        await go(pg, BASE + "#/giocatori", 1500); await check_page(pg, f"{L} giocatori")
        await pg.fill("#pl-q", "a"); await pg.wait_for_timeout(200)
        ok(await pg.locator(".player-card:not(.hidden)").count() > 0, f"{L}: ricerca giocatori")
        await pg.fill("#pl-q", "")
        n = await pg.locator(".player-card:not(.hidden)").count()
        for j in sorted({0, n // 2, n - 1}):
            await go(pg, BASE + "#/giocatori", 1200)
            await pg.locator(".player-card:not(.hidden)").nth(j).click(); await settle(pg)
            ok(await pg.locator("#radar .r-label").count() == 6, f"{L}: radar a 6 assi (giocatore #{j})")
            labels = await pg.locator("#radar .r-val").all_text_contents()
            total = await pg.locator(".skills .sk-total b").text_content()
            ok(str(sum(int(x) for x in labels)) == total.strip(), f"{L}: valore generale = somma dei valori ({labels} → {total})")
            ok(await pg.locator(".sk-seg").count() == 0, f"{L}: editor radar visibile senza accesso")
            await check_page(pg, f"{L} profilo#{j}")
        # cambio pagina rapido: la pagina lasciata a metà non deve sovrascrivere quella nuova
        await go(pg, BASE + "#/giocatori")
        await pg.locator(".player-card").first.click()
        await pg.wait_for_timeout(60)
        await pg.evaluate("location.hash = '#/partite'")
        await pg.wait_for_timeout(4000)
        ok("#/partite" in pg.url and await pg.locator(".match-card").count() > 0 and await pg.locator("#radar").count() == 0,
           f"{L}: cambio pagina rapido mostra la pagina giusta")
        for r in ["#/albo", "#/regolamento", "#/login", "#/registrati"]:
            await go(pg, BASE + r, 1200); await check_page(pg, f"{L} {r}")


# ---------------------------------------------------------------- 2. mock: ruoli e scritture
async def giro_mock(b, errs):
    try:
        await _giro_mock(b, errs)
    except Exception as e:
        problems.append(f"mock: interrotto → {str(e).splitlines()[0]}")


async def _giro_mock(b, errs):
    U = lambda role, extra="": f"{BASE}?role={role}&slow={SLOW}{extra}"

    # anonimo: registrazione
    pg = await new_page(b, errs, mock=True)
    await go(pg, U("anon") + "#/area", 1500)
    ok("#/login" in pg.url, "anon: Area porta al login")
    await go(pg, U("anon") + "#/registrati", 1500)
    await pg.fill('[name="nickname"]', "Fulmine"); await pg.fill('[name="full_name"]', "Luca Bianchi")
    await pg.fill('[name="email"]', "l@x.it"); await pg.fill('[name="password"]', "segreta1")
    await pg.click('button[type="submit"]'); await pg.wait_for_timeout(900)
    ok(await pg.evaluate("!!window.__signup && window.__signup.nickname === 'Fulmine'"), "anon: registrazione invia nickname e nome")
    await check_page(pg, "anon registrazione"); await pg.context.close()

    # in attesa / rifiutato
    for role, title in [("pending", "Registrazione in attesa"), ("rejected", "Registrazione non accettata")]:
        pg = await new_page(b, errs, mock=True)
        await go(pg, U(role) + "#/area", 1500)
        ok((await pg.locator("#app h2").first.text_content()) == title, f"{role}: messaggio corretto")
        await go(pg, U(role) + "#/tabellino", 1500)
        ok(await pg.locator("#f-match").count() == 0, f"{role}: niente tabellino")
        await check_page(pg, role); await pg.context.close()

    # giocatore: voto con commento, niente poteri extra
    pg = await new_page(b, errs, mock=True, scheme="light")
    await go(pg, U("player") + "#/area", 1500)
    ok(await pg.locator("#area-tabs").count() == 0, "player: niente amministrazione")
    await pg.locator('a[href^="#/vota/"]').first.click(); await settle(pg)
    ok(await pg.locator(".vote-team").count() == 2, "player: voto diviso in due squadre")
    c = pg.locator(".vote-card").first
    await c.locator('[data-score="8"]').click(); await c.locator("[data-cmt]").click(); await c.locator("textarea").fill("Bravo")
    await check_page(pg, "player voto")
    await pg.click("#vote-save"); await pg.wait_for_url("**#/partita/**"); await settle(pg)
    ok("#/partita/" in pg.url, "player: dopo il voto va alla partita")
    ok(await pg.locator(".comment").count() == 1, "player: commento visibile")
    ok("Thor" in (await pg.locator(".comment .who").first.inner_text()), "player: commento firmato")
    ok(await pg.locator(".cmt-del").count() == 0, "player: niente cestino commenti")
    ok(await pg.locator('a[href^="#/tabellino/"]').count() == 0, "player: niente Modifica partita")
    await check_page(pg, "player partita")
    await go(pg, U("player") + "#/partite", 1500)
    ok(await pg.locator(".fab").count() == 0, "player: niente + nuovo tabellino")
    await go(pg, U("player") + "#/giocatori", 1500); await pg.locator(".player-card").first.click(); await settle(pg)
    ok(await pg.locator(".sk-seg").count() == 0, "player: radar in sola lettura")
    ok(await pg.locator(".am").count() > 0, "player: andamento presente")
    await check_page(pg, "player profilo"); await pg.context.close()

    # score keeper e allenatore: tabellino; radar solo per l'allenatore
    for role in ["scorekeeper", "coach"]:
        pg = await new_page(b, errs, mock=True)
        await go(pg, U(role) + "#/partite", 1500)
        ok(await pg.locator(".fab").count() == 1, f"{role}: + nuovo tabellino")
        await go(pg, U(role) + "#/tabellino", 1500)
        picks = pg.locator("#pool .pick")
        for _ in range(3): await picks.first.click()
        await pg.click("#seg-nera")
        for _ in range(3): await picks.first.click()
        await pg.fill("#sc-b", "5"); await pg.dispatch_event("#sc-b", "input"); await pg.fill("#sc-n", "3"); await pg.dispatch_event("#sc-n", "input")
        await check_page(pg, f"{role} tabellino")
        await pg.click("#btn-save"); await settle(pg)
        saved = await pg.evaluate("window.__saved")
        ok(saved and len(saved["bianca"]) == 3 and len(saved["nera"]) == 3 and saved["result"] == "bianca" and saved["score_bianca"] == 5, f"{role}: tabellino salvato correttamente ({saved})")
        await pg.locator('a[href^="#/tabellino/"]').click(); await settle(pg)
        ok(await pg.locator("#board-bianca .tag").count() == 3, f"{role}: modifica tabellino ricarica le squadre")
        await go(pg, U(role) + "#/giocatori", 1500); await pg.locator(".player-card").first.click(); await settle(pg)
        has_editor = await pg.locator(".sk-seg").count() == 6
        ok(has_editor == (role == "coach"), f"{role}: editor radar {'presente' if role == 'coach' else 'assente'}")
        if has_editor:
            # passaggio rapido tra due giocatori: il salvataggio deve andare al secondo
            await go(pg, U(role) + "#/giocatori")
            first = await pg.locator(".player-card").nth(0).get_attribute("data-go")
            second = await pg.locator(".player-card").nth(1).get_attribute("data-go")
            await pg.evaluate(f"location.hash = '{first}'"); await pg.wait_for_timeout(80)
            await pg.evaluate(f"location.hash = '{second}'"); await settle(pg); await pg.wait_for_timeout(1500)
            await pg.click('[data-sk="difesa"][data-v="5"]'); await pg.click("#sk-save"); await settle(pg); await pg.wait_for_timeout(800)
            ok(await pg.evaluate(f"window.__skills && '#/giocatore/' + window.__skills.player_id === '{second}'"), f"{role}: radar salvato sul giocatore mostrato")
            await go(pg, U(role) + "#/giocatori"); await pg.locator(".player-card").first.click(); await settle(pg)
            await pg.click('[data-sk="lancio"][data-v="4"]'); await pg.click("#sk-save"); await pg.wait_for_timeout(900)
            ok(await pg.evaluate("window.__skills && window.__skills.lancio === 4"), "coach: caratteristiche salvate")
        await check_page(pg, f"{role} profilo"); await pg.context.close()

    # organizzatore: cancella commento, tutte le schede admin, richieste
    for vp, scheme in [((390, 844), "dark"), ((1280, 900), "light")]:
        pg = await new_page(b, errs, vp, scheme, mock=True)
        L = f"admin {vp[0]}"
        await go(pg, U("admin", "&withplayer") + "#/area", 1500)
        await pg.locator('a[href^="#/vota/"]').first.click(); await settle(pg)
        c = pg.locator(".vote-card").first
        await c.locator('[data-score="7"]').click(); await c.locator("[data-cmt]").click(); await c.locator("textarea").fill("Da cancellare")
        await pg.click("#vote-save"); await pg.wait_for_url("**#/partita/**"); await settle(pg)
        ok(await pg.locator(".cmt-del").count() == 1, f"{L}: cestino visibile")
        await pg.click(".cmt-del"); await pg.wait_for_function("!!window.__removed"); await pg.wait_for_timeout(300); await settle(pg)
        ok(await pg.evaluate("!!window.__removed"), f"{L}: click sul cestino cancella (con conferma)")
        ok(await pg.locator(".comment").count() == 0, f"{L}: commento sparito")
        # stessa cosa dalla scheda giocatore
        await go(pg, U("admin", "&withplayer") + "#/area", 1500)
        await pg.locator('a[href^="#/vota/"]').first.click(); await settle(pg)
        c = pg.locator(".vote-card").first; rated = await c.get_attribute("data-id")
        await c.locator('[data-score="6"]').click(); await c.locator("[data-cmt]").click(); await c.locator("textarea").fill("Anche qui")
        await pg.click("#vote-save"); await pg.wait_for_url("**#/partita/**"); await settle(pg)
        await go(pg, U("admin", "&withplayer") + f"#/giocatore/{rated}", 2000)
        await pg.evaluate("window.__removed = null")
        ok(await pg.locator(".cmt-del").count() == 1, f"{L}: cestino nella scheda giocatore")
        await pg.click(".cmt-del"); await pg.wait_for_function("!!window.__removed"); await pg.wait_for_timeout(300); await settle(pg)
        ok(await pg.evaluate("!!window.__removed"), f"{L}: cancellazione dalla scheda giocatore")
        # schede di amministrazione
        await go(pg, U("admin") + "#/area", 1800)
        for t in ["players", "users", "seasons", "mom", "radar", "texts"]:
            await pg.click(f'#area-tabs button[data-t="{t}"]')
            await pg.wait_for_function(f"(() => {{ const e = document.querySelector('[data-atab=\"{t}\"]'); return e && e.innerText.trim() && !e.innerText.startsWith('Caricamento'); }})()", timeout=20000)
            ok(await pg.locator(f'[data-atab="{t}"]:not(.hidden)').inner_text() != "", f"{L}: scheda {t} vuota")
            await check_page(pg, f"{L} admin/{t}")
        await pg.click('#area-tabs button[data-t="users"]'); await pg.wait_for_selector("#adm-users .req [data-ok]")
        await pg.locator("#adm-users .req [data-ok]").first.click(); await pg.wait_for_function("!!window.__approved"); await pg.wait_for_selector("#adm-users .req [data-no]")
        ok(await pg.evaluate("!!window.__approved"), f"{L}: accetta registrazione")
        await pg.locator("#adm-users .req [data-no]").first.click(); await pg.wait_for_timeout(1500); await pg.wait_for_selector("#adm-users .req [data-del]")
        await pg.locator("#adm-users .req [data-del]").last.click(); await pg.wait_for_timeout(1500)
        ok(await pg.evaluate("!!window.__deleted"), f"{L}: elimina utente")
        await pg.click('#area-tabs button[data-t="radar"]'); await pg.wait_for_selector("#rl-lancio")
        await pg.fill("#rl-lancio", "Lancio lungo"); await pg.click("#rl-save"); await settle(pg)
        await go(pg, U("admin") + "#/giocatori", 1500); await pg.locator(".player-card").first.click(); await settle(pg)
        ok(await pg.locator(".sk-seg").count() == 6, f"{L}: editor radar per l'organizzatore")
        await check_page(pg, f"{L} profilo")
        await go(pg, U("admin") + "#/regolamento", 1500); await check_page(pg, f"{L} regolamento")
        await pg.context.close()


async def main():
    errs = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        await giro_reale(b, errs)
        await giro_mock(b, errs)
        await b.close()
    for e in errs: problems.append("errore JS " + e)
    print(f"\nControlli superati: {passed}")
    if problems:
        print(f"PROBLEMI ({len(problems)}):"); [print(" -", x) for x in problems]; sys.exit(1)
    print("Nessun problema trovato.")

asyncio.run(main())
