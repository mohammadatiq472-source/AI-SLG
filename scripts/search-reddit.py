import requests
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

# Search Reddit
r = requests.get('https://www.reddit.com/search.json?q=openai+codex+money+earn+autonomous&sort=new&limit=10', headers=headers)

if r.status_code == 200:
    data = r.json()
    posts = data.get('data', {}).get('children', [])
    
    print("=== Reddit Search Results ===\n")
    for post in posts:
        post_data = post.get('data', {})
        title = post_data.get('title', '')
        url = post_data.get('url', '')
        selftext = post_data.get('selftext', '')[:200]
        
        print(f"Title: {title}")
        print(f"URL: {url}")
        if selftext:
            print(f"Text: {selftext}")
        print("---")
else:
    print(f"Error: {r.status_code}")
    print(r.text[:500])
