import re
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()
start = html.find('<div id="gameScreen"')
content = html[start:start+4000]
print(content.count('<div'), content.count('</div'))
