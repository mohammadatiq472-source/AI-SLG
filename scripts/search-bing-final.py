import requests
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

r = requests.get('https://www.bing.com/search?q=codex+openai+sam+altman+money+earn+autonomous+viral+tweet+2026')

h2_tags = re.findall(r'<h2[^>]*>(.*?)</h2>', r.text, re.DOTALL)
print("=== Bing Search Results ===\n")
for i, tag in enumerate(h2_tags[:10]):
    clean = re.sub(r'<[^>]+>', '', tag).strip()
    if clean:
        print(f"{i+1}. {clean}")

print("\n=== Looking for money/earn related ===\n")

# Search for money/earn related content
money_content = re.findall(r'(?:money|earn|dollar|\$|profit|revenue)[^.]*\.', r.text, re.IGNORECASE)
for i, content in enumerate(money_content[:10]):
    clean = re.sub(r'<[^>]+>', '', content).strip()
    if clean:
        print(f"- {clean[:150]}")
