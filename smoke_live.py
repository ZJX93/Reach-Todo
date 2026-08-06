import asyncio, random
from playwright.async_api import async_playwright

URL = "https://a6b47180c33600087.bj6.agentos-app.net"
USER = f"smoke_{random.randint(1000,9999)}"
PW = "test1234"

async def shot(pg, w, h, path, full=False):
    await pg.set_viewport_size({"width": w, "height": h})
    await pg.wait_for_timeout(400)
    await pg.screenshot(path=path, full_page=full)
    print("saved", path)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        pg = await b.new_page()
        await pg.goto(URL, wait_until="load")

        # 登录页（新玻璃设计）
        await shot(pg, 1280, 900, "/workspace/live_login.png")

        # 切到注册并创建用户
        await pg.click("button:has-text('去注册')")
        await pg.wait_for_timeout(200)
        await pg.fill("input[placeholder='例如 alice']", USER)
        await pg.fill("input[type='password']", PW)
        await pg.click("button:has-text('注册并进入')")
        await pg.wait_for_selector("text=今日待办", timeout=8000)
        await shot(pg, 1280, 900, "/workspace/live_dashboard.png")

        # 切换几个页面验证玻璃风格
        for label in ["记录", "日历", "我的目标", "专注 / 番茄钟", "回顾 / 数据", "四象限"]:
            try:
                await pg.click(f".sidebar button:has-text('{label}')")
                await pg.wait_for_timeout(400)
                safe = label.replace(" / ", "_").replace(" ", "_")
                await shot(pg, 1280, 900, f"/workspace/live_{safe}.png")
            except Exception as e:
                print("skip", label, e)

        # 移动端登录
        await pg.goto(URL, wait_until="load")
        await shot(pg, 390, 1400, "/workspace/live_login_m.png", full=True)

        await b.close()

asyncio.run(main())
