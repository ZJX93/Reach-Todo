import asyncio
from playwright.async_api import async_playwright

URL = "file:///workspace/app-ui/shell.html"
NAV = ["今日待办", "记录", "日历", "回顾 / 数据", "四象限", "我的目标", "专注 / 番茄钟"]
FILES = {
    "今日待办": "app_dashboard.png",
    "记录": "app_records.png",
    "日历": "app_calendar.png",
    "回顾 / 数据": "app_stats.png",
    "四象限": "app_matrix.png",
    "我的目标": "app_goals.png",
    "专注 / 番茄钟": "app_focus.png",
}

async def shot(pg, w, h, path):
    await pg.set_viewport_size({"width": w, "height": h})
    await pg.wait_for_timeout(350)
    await pg.screenshot(path=path, full_page=True)
    print("saved", path)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        pg = await b.new_page()
        await pg.goto(URL)

        await shot(pg, 1280, 900, "/workspace/app_login.png")
        await pg.click("text=登录 →")

        for label in NAV:
            await pg.click(f'.sidebar button:has-text("{label}")')
            await pg.wait_for_timeout(250)
            await shot(pg, 1280, 900, "/workspace/" + FILES[label])

        # 记录编辑器弹窗
        await pg.click('.sidebar button:has-text("记录")')
        await pg.wait_for_timeout(200)
        await pg.click('button:has-text("+ 新建记录")')
        await pg.wait_for_timeout(300)
        await pg.screenshot(path="/workspace/app_editor.png")
        print("saved /workspace/app_editor.png")

        # 移动端
        await pg.goto(URL)
        await shot(pg, 390, 1400, "/workspace/app_login_m.png")
        await pg.click("text=登录 →")
        await shot(pg, 390, 1400, "/workspace/app_dashboard_m.png")
        await pg.click('.mn-item[data-view="calendar"]')
        await pg.wait_for_timeout(300)
        await pg.screenshot(path="/workspace/app_mobile_nav.png")
        print("saved /workspace/app_mobile_nav.png")

        await b.close()

asyncio.run(main())
