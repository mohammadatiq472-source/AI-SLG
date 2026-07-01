import asyncio
from playwright.async_api import async_playwright
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

async def search_twitter():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            executable_path='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        
        try:
            page = await browser.new_page()
            
            # Try nitter.net
            print("=== Trying nitter.net ===")
            await page.goto('https://nitter.net/sama/status/2053566155571560868', timeout=30000)
            await page.wait_for_timeout(3000)
            
            content = await page.content()
            print(f"Content length: {len(content)}")
            
            # Look for tweet content
            tweet_text = await page.query_selector_all('.tweet-content')
            for i, tweet in enumerate(tweet_text[:3]):
                text = await tweet.text_content()
                if text:
                    print(f"Tweet {i+1}: {text[:300]}")
            
            # Look for media
            media = await page.query_selector_all('.attachment img')
            for i, img in enumerate(media[:3]):
                src = await img.get_attribute('src')
                if src:
                    print(f"Media {i+1}: {src}")
            
            # Look for any mention of money/earn
            all_text = await page.text_content('body')
            if all_text:
                money_patterns = [
                    r'(?:money|earn|dollar|\$|profit|revenue).*?\.',
                    r'(?:codex|openai|sam).*?(?:money|earn|dollar).*?\.',
                ]
                
                for pattern in money_patterns:
                    matches = re.findall(pattern, all_text, re.IGNORECASE | re.DOTALL)
                    for match in matches[:3]:
                        if len(match) > 20:
                            print(f"Money related: {match[:200]}")
            
        finally:
            await browser.close()

asyncio.run(search_twitter())
