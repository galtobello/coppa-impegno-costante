import asyncio, sys
from playwright.async_api import async_playwright
OUT = sys.argv[1]; BASE = "http://localhost:8787/index.html"
mock = open("scripts/api-mock.js", encoding="utf-8").read()
async def ctx_for(b, role):
    ctx = await b.new_context(viewport={"width": 420, "height": 900}, color_scheme="dark")
    await ctx.route("**/api.js*", lambda r: r.fulfill(body=mock, content_type="text/javascript"))
    page = await ctx.new_page(); errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    return ctx, page, errs
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # --- SCOREKEEPER: nuovo tabellino
        ctx, page, errs = await ctx_for(b, "scorekeeper")
        await page.goto(BASE + "?role=scorekeeper#/area"); await page.wait_for_timeout(800)
        await page.screenshot(path=f"{OUT}/ui_area_scorekeeper.png", full_page=True)
        await page.goto(BASE + "?role=scorekeeper#/tabellino"); await page.wait_for_timeout(800)
        picks = await page.query_selector_all(".pick")
        for i in range(6): await picks[i].click()                 # 6 in bianca
        for i in range(6, 12): await picks[i].click(); await picks[i].click()  # 6 in nera
        await page.select_option('select[name="result"]', "nera")
        await page.screenshot(path=f"{OUT}/ui_tabellino.png", full_page=True)
        await page.click('button[type=submit]'); await page.wait_for_timeout(800)
        saved = await page.evaluate("window.__saved")
        assert saved and len(saved["bianca"]) == 6 and len(saved["nera"]) == 6 and saved["result"] == "nera", saved
        assert "#/partita/" in page.url
        await page.screenshot(path=f"{OUT}/ui_partita_nuova.png", full_page=True)
        print("tabellino OK", errs); await ctx.close()
        # --- PLAYER: vota
        ctx, page, errs = await ctx_for(b, "player")
        await page.goto(BASE + "?role=player#/area"); await page.wait_for_timeout(800)
        await page.screenshot(path=f"{OUT}/ui_area_player.png", full_page=True)
        n = await page.locator('a[href^="#/vota/"]').count(); assert n > 0, "nessuna partita votabile"
        await page.locator('a[href^="#/vota/"]').first.click(); await page.wait_for_timeout(800)
        rows = page.locator(".vote-row"); cnt = await rows.count(); assert cnt >= 5, cnt
        nicks = await rows.locator(".nick").all_inner_texts(); assert not any("Thor" in x for x in nicks), nicks
        await rows.nth(0).locator("input[type=range]").fill("9"); await rows.nth(0).locator("textarea").fill("Grande partita")
        await rows.nth(1).locator(".skip").click()
        await page.screenshot(path=f"{OUT}/ui_vota.png", full_page=True)
        await page.click('button[type=submit]'); await page.wait_for_timeout(800)
        r = await page.evaluate("window.__ratings"); assert len(r) == cnt - 1 and r[0]["score"] == 9 and r[0]["comment"] == "Grande partita", r
        await page.screenshot(path=f"{OUT}/ui_partita_votata.png", full_page=True)
        print("voto OK", errs); await ctx.close()
        # --- ADMIN: pannelli
        ctx, page, errs = await ctx_for(b, "admin")
        await page.goto(BASE + "?role=admin#/area"); await page.wait_for_timeout(800)
        for t in ["players", "users", "seasons", "mom", "texts"]:
            await page.click(f'#area-tabs button[data-t="{t}"]'); await page.wait_for_timeout(500)
            await page.screenshot(path=f"{OUT}/ui_admin_{t}.png", full_page=True)
        await page.click('#area-tabs button[data-t="players"]'); await page.wait_for_timeout(300)
        await page.fill('#f-new-player input[name=nickname]', "Nuovo"); await page.click('#f-new-player button'); await page.wait_for_timeout(500)
        assert await page.locator('#adm-players input[value="Nuovo"]').count() == 1
        print("admin OK", errs); await ctx.close()
        await b.close()
asyncio.run(main())
