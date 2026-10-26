import os
import time
from playwright.sync_api import sync_playwright

video_path = r"C:\Users\Mahmoud\Downloads\WhatsApp Video 2026-10-26 at 12.50.50 PM.mp4"
out_path = r"D:\screen\pos_frame.png"

with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    page = b.new_page(viewport={"width": 1080, "height": 1920})
    file_url = "file:///" + video_path.replace("\\", "/")
    html = f"""
    <html>
    <head><style>body {{ margin: 0; background: #000; }} video {{ width: 100vw; height: 100vh; object-fit: contain; }}</style></head>
    <body>
    <video id="v" src="{file_url}" muted></video>
    </body>
    </html>
    """
    page.set_content(html)
    page.wait_for_selector("#v")
    page.evaluate("""() => {
        const v = document.getElementById('v');
        v.currentTime = 0.05;
    }""")
    time.sleep(2)
    page.screenshot(path=out_path)
    b.close()

print("Saved:", out_path)
