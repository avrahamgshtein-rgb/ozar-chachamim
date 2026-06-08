import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto('http://localhost:8080')
        
        # Wait for map to load (2 seconds)
        await page.wait_for_load_state('networkidle')
        
        # Click on geography tab
        try:
            await page.click("button[onclick*=\"'map'\"]")
            await page.wait_for_timeout(2000)  # Wait 2 seconds for map to render
        except:
            print("Could not find map tab button")
        
        # Take screenshot
        await page.screenshot(path='screenshot_map.png')
        print("Screenshot taken: screenshot_map.png")
        
        await browser.close()

asyncio.run(main())
