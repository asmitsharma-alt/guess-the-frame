with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix unclosed string literal across newlines
target1 = "alert('📋 Room invite link copied to clipboard!\n' + link);"
target2 = "alert('📋 Room invite link copied to clipboard!\r\n' + link);"
fixed = "alert('📋 Room invite link copied to clipboard!\\n' + link);"

count1 = content.count(target1)
count2 = content.count(target2)
print(f"Target occurrences: target1={count1}, target2={count2}")

content = content.replace(target1, fixed).replace(target2, fixed)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated index.html")
