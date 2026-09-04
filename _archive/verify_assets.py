import os
import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find relative asset links
matches = re.findall(r'[\'"]([^\'"\r\n]+\.(?:png|jpg|jpeg|svg|webp|gif|txt|js|css))[\'"]', html)

missing = []
found = 0
for ref in set(matches):
    if ref.startswith('http') or ref.startswith('data:') or '${' in ref:
        continue
    # Filter to local project assets
    if any(ref.startswith(prefix) for prefix in ['bg/', 'GUESSTHE', 'tie breaker/', 'avvtar/']) or ref == 'logo.png':
        if os.path.exists(ref):
            found += 1
        else:
            missing.append(ref)

print(f"Verified assets: {found} found, {len(missing)} missing.")
if missing:
    print("Missing files:", missing)
    exit(1)
else:
    print("ALL PROJECT ASSETS IN INDEX.HTML EXIST AND ARE ACCESSIBLE!")
