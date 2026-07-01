import requests
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

# Try to access Twitter/X via nitter instances
nitter_instances = [
    'https://nitter.net',
    'https://nitter.privacydev.net',
    'https://nitter.poast.org',
]

for instance in nitter_instances:
    try:
        # Search for Sam Altman's tweet
        url = f'{instance}/sama/status/2053566155571560868'
        r = requests.get(url, headers=headers, timeout=10)
        
        print(f"\n=== {instance} ===")
        print(f"Status: {r.status_code}")
        
        if r.status_code == 200:
            # Extract tweet content
            content = re.findall(r'<div class="tweet-content[^"]*">(.*?)</div>', r.text, re.DOTALL)
            for c in content[:3]:
                clean = re.sub(r'<[^>]+>', '', c).strip()
                if clean:
                    print(f"Tweet: {clean[:300]}")
            
            # Extract media
            media = re.findall(r'<a[^>]*href="([^"]*)"[^>]*class="attachment"[^>]*>', r.text)
            for m in media[:3]:
                print(f"Media: {m}")
        
    except Exception as e:
        print(f"Error with {instance}: {e}")
