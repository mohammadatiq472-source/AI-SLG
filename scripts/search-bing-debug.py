import requests
import re

r = requests.get('https://www.bing.com/search?q=codex+openai+sam+altman+money+earn+autonomous+viral+tweet+2026')

# Find all h2 tags
h2_tags = re.findall(r'<h2[^>]*>(.*?)</h2>', r.text, re.DOTALL)
print("H2 tags found:", len(h2_tags))
for i, tag in enumerate(h2_tags[:5]):
    clean = re.sub(r'<[^>]+>', '', tag).strip()
    print(f"H2 {i}: {clean}")

print("\n---\n")

# Find all links with text
links = re.findall(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', r.text, re.DOTALL)
print("Links found:", len(links))
for i, (url, text) in enumerate(links[:20]):
    clean_text = re.sub(r'<[^>]+>', '', text).strip()
    if clean_text and len(clean_text) > 10:
        print(f"Link {i}: {clean_text[:100]} -> {url[:80]}")
