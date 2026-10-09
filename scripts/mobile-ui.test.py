"""学生与后勤端浏览器回归：隔离数据库，模型回复使用固定测试数据。"""
import json
from datetime import datetime
import os
from pathlib import Path
import socket
import shutil
import subprocess
import tempfile
import time
import urllib.request

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "outputs" / "mobile-review"


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def request(url, data=None):
    req = urllib.request.Request(
        url, data=json.dumps(data).encode() if data is not None else None,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=3) as response:
        return json.load(response)


def check_width(page):
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "页面横向溢出"


def check_portal(page, base):
    captured = []

    def capture(route):
        captured.append((route.request.url, route.request.post_data_json))
        route.fulfill(status=400, json={"message": "登录提交验证完成"})

    page.route("**/api/users/login", capture)
    page.goto(base + "/", wait_until="networkidle")
    expect(page.locator('[data-role="student"]')).to_have_attribute("aria-pressed", "true")
    expect(page.locator("#switch-register")).to_be_visible()
    page.locator("#account").fill("mobile_review")
    page.locator("#password").fill("mobile-review-only-2026")
    page.locator("#submit").click()
    expect(page.locator("#auth-status")).to_have_text("登录提交验证完成")
    assert captured[-1][1]["identity"] == "student"
    page.locator("#switch-register").click()
    expect(page.locator("#register-fields")).to_be_visible()
    page.locator('[data-role="admin"]').click()
    expect(page.locator('[data-role="student"]')).to_have_attribute("aria-pressed", "false")
    expect(page.locator('[data-role="admin"]')).to_have_attribute("aria-pressed", "true")
    expect(page.locator("#register-fields")).to_be_hidden()
    expect(page.locator("#switch-register")).to_be_visible()
    expect(page.locator("#admin-fields")).to_be_visible()
    page.locator("#submit").click()
    page.wait_for_function("!document.getElementById('submit').disabled")
    assert captured[-1][1]["identity"] == "admin"
    page.locator('[data-role="student"]').click()
    expect(page.locator("#switch-register")).to_be_visible()
    page.unroute("**/api/users/login", capture)


def check_meal_browsing(page):
    catalog = page.evaluate("async () => (await (await import('/shared/core.js')).api('/workspace/catalog')).data")
    count = sum(bool(d["forSale"]) for d in catalog["dishes"])
    assert count > 0
    for hour in [7, 11, 18, 15]:
        page.clock.set_fixed_time(datetime.fromisoformat(f"2026-10-09T{hour:02}:00:00+08:00"))
        page.evaluate("window.navigate('order')")
        expect(page.locator('#menu-results [data-action="cart"]')).to_have_count(count)
        expect(page.locator("#menu-results img").first).to_be_attached()
        candidates = page.evaluate("""async () => {
          const {availableForDirectOrder} = await import('/shared/meal-service.mjs');
          const data = (await (await import('/shared/core.js')).api('/workspace/catalog')).data;
          const all = data.dishes.filter(d => d.forSale);
          return {blocked:all.find(d => !availableForDirectOrder(d))?.id,
                  allowed:all.find(d => availableForDirectOrder(d) && d.stock > 0)?.id};
        }""")
        blocked = candidates["blocked"]
        page.locator(f'#menu-results [data-action="cart"][data-id="{blocked}"]').click()
        expect(page.locator("#zx-toast")).to_contain_text("非当前用餐时段菜品无法购买")
        if candidates.get("allowed"):
            allowed = candidates["allowed"]
            page.locator(f'#menu-results [data-action="cart"][data-id="{allowed}"]').click()
            expect(page.locator("#zx-toast")).to_contain_text("已加入餐盘")
        if hour == 15:
            page.locator(f'#menu-results [data-action="plan"][data-id="{blocked}"]').click()
            expect(page.locator("#agent-screen")).to_be_visible()
            expect(page.locator(".zx-conversation")).to_contain_text("你好，我是小智")
            page.locator('#agent-screen [data-action="close"]').click()
    page.evaluate("window.scrollTo(0, 0)")


def check_management(browser, base, engine, width, height):
    context = browser.new_context(viewport={"width": width, "height": height},
                                  is_mobile=width < 768, has_touch=width < 768)
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.route("**/api/ai/chat", lambda route: route.fulfill(json={"reply": "演示数据：当前可查询后勤台账、供需矩阵和菜品目录。"}))
    page.goto(base + "/?identity=admin", wait_until="networkidle")
    page.locator("#switch-register").click()
    expect(page.locator("#admin-code")).to_have_attribute("required", "")
    expect(page.locator("#trial-entry")).to_have_count(0)
    page.locator("#school").select_option("demo")
    expect(page.locator("#account")).to_be_hidden()
    expect(page.locator("#admin-fields")).to_be_hidden()
    expect(page.locator("#register-fields")).to_be_hidden()
    expect(page.locator("#submit")).to_have_text("一键进入演示数据")
    check_width(page)
    page.screenshot(path=str(OUTPUT / f"{engine}-{width}-demo-entry.png"))
    page.locator("#submit").click()
    page.wait_for_url("**/management/#dashboard", timeout=60000)
    expect(page.locator("#demo-viz .demo-kpis")).to_be_visible(timeout=30000)
    expect(page.locator(".demo-environment-banner")).to_contain_text("演示数据")
    assert page.evaluate("document.documentElement.dataset.campusSkin") == "cufe"
    check_width(page)
    page.screenshot(path=str(OUTPUT / f"{engine}-{width}-demo-dashboard.png"), full_page=True)
    page.locator('[data-scene="breakfast"]').click()
    expect(page.locator("#demo-clock-label")).to_contain_text("07:")
    page.locator("#demo-pause").click()
    expect(page.locator("#demo-pause")).to_have_attribute("aria-pressed", "true")
    page.locator('[data-detail="traffic"]').first.click()
    expect(page.locator(".demo-detail")).to_contain_text("在厅人数")
    page.locator("#feature-dialog > header button").click()
    page.locator('[data-detail="matrix"]').first.click()
    expect(page.locator(".demo-detail")).to_contain_text("预测需求")
    page.locator("#feature-dialog > header button").click()
    if width < 768:
        page.locator("#admin-mobile-chat").click()
    else:
        page.locator(".pet-body").click()
        page.locator('[data-pet="chat"]').click()
    expect(page.locator(".pet-chat-dialog")).to_be_visible()
    page.locator('.pet-chat-form input').fill("查询供需矩阵")
    page.locator('.pet-chat-form button').click()
    expect(page.locator(".pet-chat-log")).to_contain_text("当前可查询后勤台账")
    page.locator('.pet-chat-dialog [data-close]').click()
    for module in ["forecast", "safety", "supplier", "inventory", "procurement", "canteen", "orders", "feedback"]:
        if width < 768:
            page.locator("#admin-mobile-more").click()
        page.locator(f'#sidebar [data-module="{module}"]').click()
        page.wait_for_function("document.querySelector('#admin-feature-body')?.children.length > 0")
        expect(page.locator("#admin-feature-body .zx-status.error")).to_have_count(0)
        if module in ["forecast", "safety", "supplier", "inventory", "procurement"]:
            expect(page.locator("#demo-viz .demo-kpis")).to_be_visible()
        check_width(page)
        if module in ["forecast", "safety", "supplier"]:
            page.screenshot(path=str(OUTPUT / f"{engine}-{width}-demo-{module}.png"), full_page=True)
    page.locator("#logout-btn").click()
    page.wait_for_url("**/?identity=admin")
    page.locator('[data-role="student"]').click()
    expect(page.locator('#school option[value="demo"]')).to_have_count(0)
    expect(page.locator("#account")).to_be_visible()
    assert not errors, errors
    print(f"PASS 演示后勤端 {engine} {width}x{height}", flush=True)
    context.close()


def run():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="zhixiang-mobile-") as temporary:
        for source in (ROOT / "userdata").iterdir():
            if source.is_file() and source.suffix in {".json", ".csv"}:
                shutil.copyfile(source, Path(temporary) / source.name)
        api_port, frontend_port = free_port(), free_port()
        base = f"http://127.0.0.1:{frontend_port}"
        env = dict(os.environ, PORT=str(api_port), FRONTEND_PORT=str(frontend_port),
                   API_TARGET=f"http://127.0.0.1:{api_port}",
                   DB_PATH=str(Path(temporary) / "test.db"), USERDATA_DIR=temporary,
                   DEEPSEEK_API_KEY="", NODE_ENV="development", CORS_ORIGIN=base,
                   JWT_SECRET="mobile-browser-test-secret-not-for-production")
        processes = []
        try:
            with open(Path(temporary) / "services.log", "w", encoding="utf8") as log:
                for file in ["server/server.js", "scripts/serve-frontend.mjs"]:
                    processes.append(subprocess.Popen(
                        ["node", file], cwd=ROOT, env=env, stdout=log, stderr=log,
                        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
                    ))
                deadline = time.time() + 30
                while True:
                    try:
                        request(base + "/api/health")
                        break
                    except (OSError, ValueError):
                        if any(process.poll() is not None for process in processes):
                            log.flush()
                            raise RuntimeError(Path(log.name).read_text(encoding="utf8"))
                        if time.time() >= deadline:
                            log.flush()
                            raise RuntimeError(Path(log.name).read_text(encoding="utf8"))
                request(base + "/api/users/register", {
                    "zhanghao": "mobile_review", "mima": "mobile-review-only-2026",
                    "xingming": "体验同学", "schoolId": "cufe",
                })
                account = request(base + "/api/users/login", {
                    "zhanghao": "mobile_review", "mima": "mobile-review-only-2026", "schoolId": "cufe",
                })["data"]
                school = next(s for s in request(base + "/api/users/schools")["data"] if s["id"] == "cufe")
                saved = dict(account, school=school, identity="student")
                with sync_playwright() as p:
                    for engine in os.environ.get("MOBILE_TEST_ENGINES", "chromium,webkit").split(","):
                        browser = getattr(p, engine).launch()
                        for width, height in [(390, 844), (320, 740), (1440, 1000)]:
                            selected_widths = os.environ.get("MOBILE_TEST_WIDTHS")
                            if selected_widths and str(width) not in selected_widths.split(","):
                                continue
                            check_management(browser, base, engine, width, height)
                            if os.environ.get("MOBILE_TEST_ADMIN_ONLY") == "1":
                                continue
                            context = browser.new_context(viewport={"width": width, "height": height},
                                                          is_mobile=width < 768, has_touch=width < 768)
                            context.add_init_script("localStorage.setItem('zx_session', " + json.dumps(json.dumps(saved)) + "); localStorage.setItem('zx_cufe_" + str(saved["user"]["id"]) + "_nutrition-profile-invited', 'true'); Object.defineProperty(crypto, 'randomUUID', {value: undefined, configurable:true});")
                            page = context.new_page()
                            errors = []
                            page.on("pageerror", lambda error: errors.append(str(error)))
                            page.route("**/api/tasks/conversation", lambda route: route.fulfill(json={
                                "code": 200, "data": {"reply": "你好，我是小智！今天想吃什么？", "intent": "continue",
                                                      "ready": False, "constraints": {}, "choices": []},
                            }))
                            check_portal(page, base)
                            page.goto(base + "/canteen/", wait_until="networkidle")
                            expect(page.locator("#menu-filter")).to_be_attached()
                            check_meal_browsing(page)
                            check_width(page)
                            result = page.evaluate("""async () => {
                              const {createUuid} = await import('/shared/uuid.js');
                              const ids = Array.from({length: 100}, createUuid);
                              return new Set(ids).size === 100 && ids.every(id => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id));
                            }""")
                            assert result, "UUID 兼容分支格式错误"
                            nav = page.locator(".zx-mobile-nav")
                            if width < 768:
                                expect(nav).to_be_visible()
                                expect(page.locator(".xiaozhi-pet")).to_be_hidden()
                                page.screenshot(path=str(OUTPUT / f"{engine}-{width}-home.png"))
                                page.get_by_role("button", name="召唤小智", exact=True).click()
                            else:
                                expect(nav).to_be_hidden()
                                page.screenshot(path=str(OUTPUT / f"{engine}-{width}-home.png"))
                                page.locator(".zx-banner-cta").click()
                            expect(page.locator("#agent-screen")).to_be_visible()
                            expect(page.locator(".zx-conversation")).to_contain_text("你好，我是小智")
                            expect(page.locator("#agent-chat button[type=submit]")).to_be_enabled()
                            check_width(page)
                            page.screenshot(path=str(OUTPUT / f"{engine}-{width}-agent.png"))
                            page.locator("#agent-chat textarea").fill("我想吃清淡一点")
                            page.locator("#agent-chat button[type=submit]").click()
                            expect(page.locator(".zx-conversation")).to_contain_text("我想吃清淡一点")
                            page.locator('#agent-screen [data-action="close"]').click()
                            expect(page.locator("#agent-screen")).to_have_count(0)
                            if width < 768:
                                expect(page.locator('[data-mobile-view="order"]')).to_have_attribute("aria-current", "page")
                                for view, title in [("nutrition", "AI营养师"), ("orders", "我的订单")]:
                                    page.locator(f'[data-mobile-view="{view}"]').click()
                                    expect(page.locator("#app-root h1")).to_have_text(title)
                                    if page.locator("#feature-dialog[open]").count():
                                        page.locator("#feature-dialog > header button").click()
                                    check_width(page)
                                    page.screenshot(path=str(OUTPUT / f"{engine}-{width}-{view}.png"))
                                    if view == "nutrition":
                                        page.locator('[data-action="upgrade"]').click()
                                        expect(page.locator("#feature-dialog")).to_be_visible()
                                        page.locator("#feature-dialog > header button").click()
                                page.locator('[data-mobile-view="profile"]').click()
                                expect(page.locator("#profile-name")).to_be_visible()
                                check_width(page)
                                page.screenshot(path=str(OUTPUT / f"{engine}-{width}-profile.png"))
                                page.locator("#modal-container .glass-modal").click(position={"x": 2, "y": 2})
                                for view in ["social", "culture"]:
                                    page.locator(".zx-mobile-menu").click()
                                    page.locator(f'#feature-dialog [data-action="{view}"]').click()
                                    expect(page.locator("#app-root h1")).to_be_visible()
                                    expect(page.locator("#app-root .zx-status.error")).to_have_count(0)
                                    check_width(page)
                                    page.screenshot(path=str(OUTPUT / f"{engine}-{width}-{view}.png"))
                            assert not errors, errors
                            print(f"PASS {engine} {width}x{height}", flush=True)
                            context.close()
                        browser.close()
        finally:
            for process in processes:
                process.terminate()
            for process in processes:
                process.wait(timeout=10)


if __name__ == "__main__":
    run()
