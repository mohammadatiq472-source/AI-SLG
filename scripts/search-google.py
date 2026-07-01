import requests
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

r = requests.get('https://www.google.com/search?q=openai+codex+%24200+earned+money+autonomous+viral+tweet+2026', headers=headers)

# Extract titles
titles = re.findall(r'<h3[^>]*>(.*?)</h3>', r.text, re.DOTALL)
print("=== Google Search Results ===\n")
for i, tag in enumerate(titles[:15]):
    clean = re.sub(r'<[^>]+>', '', tag).strip()
    if clean:
        print(f"{i+1}. {clean}")

print("\n=== Looking for links ===\n")

# Extract links
links = re.findall(r'<a[^>]*href="(/url\?q=[^"]*)"[^>]*>(.*?)</a>', r.text, re.DOTALL)
for i, (url, text) in enumerate(links[:20]):
    clean_text = re.sub(r'<[^>]+>', '', text).strip()
    if clean_text and len(clean_text) > 10:
        # Extract actual URL
        actual_url = re.search(r'q=([^&]*)', url)
        if actual_url:
            print(f"- {clean_text[:80]}")
            print(f"  URL: {actual_url.group(1)[:100]}")
