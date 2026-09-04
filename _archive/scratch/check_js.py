import re
import subprocess
import sys

with open('index.html', 'r', encoding='utf-8') as f:
    text = f.read()

scripts = list(re.finditer(r'<script(?:\s[^>]*)?>([\s\S]*?)</script>', text))
inline_script = scripts[2].group(1)

with open('scratch/inline_script.js', 'w', encoding='utf-8') as sf:
    sf.write(inline_script)

res = subprocess.run(['node', '--check', 'scratch/inline_script.js'], capture_output=True, text=True)
if res.returncode == 0:
    print("SUCCESS: JavaScript syntax is completely valid!")
else:
    print("SYNTAX ERROR:")
    print(res.stderr)
