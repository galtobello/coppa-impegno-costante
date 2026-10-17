import asyncio, sys
from playwright.async_api import async_playwright
OUT = sys.argv[1]
routes = [("#/", "classifica"), ("#/partite", "partite"), ("#/giocatori", "giocatori"), ("#/albo", "albo"), ("#/regolamento", "regolamento")]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        errors = []
        for vp, tag in [({"width": 390, "height": 844}, "mobile"), ({"width": 1280, "height": 900}, "desktop")]:
            ctx = await b.new_context(viewport=vp, color_scheme="dark", device_scale_factor=1)
            page = await ctx.new_page()
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            for h, name in routes:
                await page.goto("http://localhost:8787/index.html" + h)
                await page.wait_for_timeout(900)
                await page.screenshot(path=f"{OUT}/{tag}_{name}.png", full_page=(tag == "desktop"))
            # dettaglio partita e giocatore
            await page.goto("http://localhost:8787/index.html#/partite"); await page.wait_for_timeout(700)
            await page.click(".match-card"); await page.wait_for_timeout(700)
            await page.screenshot(path=f"{OUT}/{tag}_partita.png", full_page=True)
            await page.goto("http://localhost:8787/index.html#/giocatori"); await page.wait_for_timeout(700)
            await page.click(".player-card"); await page.wait_for_timeout(900)
            await page.screenshot(path=f"{OUT}/{tag}_giocatore.png", full_page=True)
            # tab efficienza
            await page.goto("http://localhost:8787/index.html#/"); await page.wait_for_timeout(700)
            await page.click('#tabs button[data-t="eff"]'); await page.wait_for_timeout(300)
            await page.screenshot(path=f"{OUT}/{tag}_efficienza.png", full_page=False)
            await ctx.close()
        await b.close()
        print("ERRORS:", errors)
asyncio.run(main())
