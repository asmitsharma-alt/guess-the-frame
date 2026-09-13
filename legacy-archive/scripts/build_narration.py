import os
import subprocess

audio_dir = 'recordings/audio'
files = [
    'scene1_home.mp3',
    'scene2_avatar.mp3',
    'scene3_lobby.mp3',
    'scene4_guide.mp3',
    'scene5_gameplay.mp3',
    'scene6_scoring.mp3',
    'scene7_victory.mp3'
]

concat_list_path = os.path.join(audio_dir, 'concat.txt')
with open(concat_list_path, 'w', encoding='utf-8') as f:
    for fname in files:
        f.write(f"file '{fname}'\n")

out_path = os.path.join(audio_dir, 'narration_full.mp3')
cmd = ['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_list_path, '-c:a', 'libmp3lame', '-q:a', '2', out_path]
subprocess.run(cmd, check=True)

# Calculate cumulative offsets
cum = 0.0
print("--- SCENE TIMELINE ---")
for fname in files:
    path = os.path.join(audio_dir, fname)
    probe_cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path]
    dur = float(subprocess.check_output(probe_cmd).decode().strip())
    print(f"{fname}: start={cum:.2f}s, dur={dur:.2f}s, end={cum+dur:.2f}s")
    cum += dur
print(f"Total combined narration duration: {cum:.2f}s")
