import requests
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

# Search on different news sites
sites = [
    'https://www.theverge.com/search?q=openai+codex+money',
    'https://techcrunch.com/?s=openai+codex+money',
    'https://www.wired.com/search/?q=openai+codex+money',
]

for site_url in sites:
    try:
        r = requests.get(site_url, headers=headers, timeout=10)
        print(f"\n=== {site_url.split('/')[2]} ===")
        
        # Find titles
        titles = re.findall(r'<h[23][^>]*>(.*?)</h[23]>', r.text, re.DOTALL)
        for i, title in enumerate(titles[:5]):
            clean = re.sub(r'<[^>]+>', '', title).strip()
            if clean and len(clean) > 10:
                print(f"- {clean[:100]}")
    except Exception as e:
        print(f"Error fetching {site_url}: {e}")
