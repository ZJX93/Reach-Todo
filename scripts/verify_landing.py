import asyncio
from playwright.async_api import async_playwright

async def shot(pg, url, w, h, path):
    await pg.set_viewport_size({"width": w, "height": h})
    await pg.goto(url, wait_until="load")
    await pg.wait_for_timeout(600)
    await pg.screenshot(path=path, full_page=True)
    print("saved", path)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        pg = await b.new_page()
        url = "file:///workspace/landing/index.html"
        await shot(pg, url, 1280, 900, "/workspace/landing_desktop.png")
        await shot(pg, url, 390, 1400, "/workspace/landing_mobile.png")
        await b.close()

asyncio.run(main())
