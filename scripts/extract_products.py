import os
import time
from playwright.sync_api import sync_playwright
from PIL import Image

video_path = r"C:\Users\Mahmoud\Downloads\WhatsApp Video 2026-10-26 at 12.50.50 PM.mp4"
output_dir = r"D:\screen\kuwait_pos_products"
os.makedirs(output_dir, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1080, 'height': 1920})
    
    # Load video in html
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ margin: 0; background: #000; overflow: hidden; }}
            video {{ width: 100vw; height: 100vh; object-fit: contain; }}
        </style>
    </head>
    <body>
        <video id="v" src="file:///{video_path.replace(os.sep, '/')}" autoplay muted></video>
    </body>
    </html>
    """
    page.set_content(html_content)
    
    # Wait for video metadata to load and seek
    page.wait_for_selector("#v")
    page.evaluate("() => { const v = document.getElementById('v'); v.currentTime = 0.5; v.pause(); }")
    time.sleep(1.5)
    
    screenshot_path = os.path.join(output_dir, "full_frame_0.png")
    page.screenshot(path=screenshot_path)
    print(f"Captured: {screenshot_path}")

    # Also capture at 2.5s
    page.evaluate("() => { const v = document.getElementById('v'); v.currentTime = 2.5; v.pause(); }")
    time.sleep(1.0)
    screenshot_path_2 = os.path.join(output_dir, "full_frame_2.png")
    page.screenshot(path=screenshot_path_2)
    print(f"Captured: {screenshot_path_2}")

    browser.close()
