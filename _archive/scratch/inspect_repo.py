import os
import re
import json

def analyze_index_html():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # Find all file references in index.html
    matches = re.findall(r'[\'"]([^\'"\r\n]+\.(?:png|jpg|jpeg|svg|webp|gif|bmp|js|css|json|txt))[\'"]', html)
    print("=== File references in index.html ===")
    unique_refs = sorted(set(matches))
    for ref in unique_refs:
        # Check if file exists locally
        exists = os.path.exists(ref)
        print(f"  {ref} (exists locally: {exists})")
    
    return unique_refs

def analyze_root_entries():
    print("\n=== Root Directory Entries & Categories ===")
    entries = os.listdir('.')
    for entry in sorted(entries):
        is_dir = os.path.isdir(entry)
        size = 0
        if not is_dir:
            size = os.path.getsize(entry)
        print(f"{'[DIR]' if is_dir else '[FILE]'} {entry} ({size} bytes if file)")

if __name__ == '__main__':
    analyze_index_html()
    analyze_root_entries()
