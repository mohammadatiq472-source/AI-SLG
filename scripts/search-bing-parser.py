import requests
import re

r = requests.get('https://www.bing.com/search?q=codex+openai+sam+altman+money+earn+autonomous+viral+tweet+2026')

titles = re.findall(r'<h2><a[^>]*>(.*?)</a></h2>', r.text)
snippets = re.findall(r'<p class="b_lineclamp[^"]*">(.*?)</p>', r.text)

for i in range(min(10, len(titles))):
    clean_title = re.sub(r'<[^>]+>', '', titles[i])
    print(f'Title: {clean_title}')
    if i < len(snippets):
        clean_snippet = re.sub(r'<[^>]+>', '', snippets[i])
        print(f'Snippet: {clean_snippet}')
    print('---')
