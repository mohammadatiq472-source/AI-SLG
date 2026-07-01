import requests
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

# Try nitter.net
url = 'https://nitter.net/sama/status/2053566155571560868'
r = requests.get(url, headers=headers, timeout=10)

print(f"Status: {r.status_code}")
print(f"Content length: {len(r.text)}")

# Save to file for inspection
with open('twitter_response.html', 'w', encoding='utf-8') as f:
    f.write(r.text)

# Look for any content
print("\n=== Looking for content ===")

# Look for tweet text
tweet_patterns = [
    r'<div class="tweet-content[^"]*">(.*?)</div>',
    r'<div class="media-body">(.*?)</div>',
    r'<p[^>]*>(.*?)</p>',
]

for pattern in tweet_patterns:
    matches = re.findall(pattern, r.text, re.DOTALL)
    for match in matches[:3]:
        clean = re.sub(r'<[^>]+>', '', match).strip()
        if clean and len(clean) > 10:
            print(f"Found: {clean[:200]}")

# Look for any mention of money/earn
money_patterns = [
    r'(?:money|earn|dollar|\$|profit|revenue).*?\.',
    r'(?:codex|openai|sam).*?(?:money|earn|dollar).*?\.',
]

for pattern in money_patterns:
    matches = re.findall(pattern, r.text, re.IGNORECASE | re.DOTALL)
    for match in matches[:3]:
        clean = re.sub(r'<[^>]+>', '', match).strip()
        if clean and len(clean) > 20:
            print(f"Money related: {clean[:200]}")
