import requests
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Search in English
r = requests.get('https://www.bing.com/search?q=openai+codex+%24200+plan+earned+money+autonomous+viral+tweet&setlang=en')

h2_tags = re.findall(r'<h2[^>]*>(.*?)</h2>', r.text, re.DOTALL)
print("=== Bing Search Results (English) ===\n")
for i, tag in enumerate(h2_tags[:15]):
    clean = re.sub(r'<[^>]+>', '', tag).strip()
    if clean:
        print(f"{i+1}. {clean}")

print("\n=== Looking for specific content ===\n")

# Look for content about earning money
patterns = [
    r'(?:earned|made|generated)\s+(?:\$|\d+\s+dollars?).*?\.',
    r'(?:autonomous|automatic)\s+(?:money|earning|revenue).*?\.',
    r'(?:viral|twitter|tweet).*?(?:money|earn|dollar).*?\.',
]

for pattern in patterns:
    matches = re.findall(pattern, r.text, re.IGNORECASE | re.DOTALL)
    for match in matches[:3]:
        clean = re.sub(r'<[^>]+>', '', match).strip()
        if clean and len(clean) > 20:
            print(f"- {clean[:200]}")
