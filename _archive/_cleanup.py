import os
import shutil

archive_dir = '_archive'
os.makedirs(archive_dir, exist_ok=True)

items_to_move = [
    'agent',
    'dist_site',
    'old_site',
    'stitch_neo_brutalist_arcade_lobby',
    'scratch',
    'pw_shots',
    'test-results',
    '.playwright-cli',
    'graphify-out',
    'New Text Document.txt',
    'server.log',
    'test.py',
    'pw_probe.js',
    'prompt.md',
    'bg.png',
    'current-home.png',
    'lobby.png',
    'lobby-current.png',
    'lobby-entry.png',
    'lobby-final.png',
    'lobby-fixed.png',
    'prev_deployment.tar.gz',
    'stitch_neo_brutalist_arcade_lobby.zip'
]

for item in items_to_move:
    if os.path.exists(item):
        dest = os.path.join(archive_dir, os.path.basename(item))
        print(f"Moving: {item} -> {dest}")
        shutil.move(item, dest)
    else:
        print(f"Not found: {item}")

print("Move completed successfully.")
