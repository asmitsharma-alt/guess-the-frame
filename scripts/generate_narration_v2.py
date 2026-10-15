import asyncio
import os
import json
import subprocess
import edge_tts

AUDIO_DIR = "recordings/audio_v2"
os.makedirs(AUDIO_DIR, exist_ok=True)

# Highly conversational, warm, human Copilot neural voice
VOICE = "en-US-BrianMultilingualNeural"

# 9-Step Gameplay Script as requested by user
SCENE_SCRIPTS = [
    ("scene1_create.mp3", "Welcome to Guess The Frame! To host a game with your friends, click Create Room."),
    ("scene2_avatar.mp3", "Type in your player name, pick your favorite animated avatar, and hit Enter to join your lobby."),
    ("scene3_rounds_invite.mp3", "Now choose your match rounds. Then, click Copy Invite Link or share your room code so your crew can jump into the lobby."),
    ("scene4_start_guide.mp3", "Once everyone is in, click Start Game. You'll have ten seconds to review the quick rules, or the host can launch round one immediately."),
    ("scene5_gameplay_points.mp3", "Round one is live! Look at the screenshot and type your movie guesses into the live chat. First correct answer gets 10 points, second gets 7, and third gets 5 points!"),
    ("scene6_hint.mp3", "Stuck on a tricky frame? Tap the Hint button to reveal missing letter blanks and solve the movie title."),
    ("scene7_host_controls.mp3", "As the host, you're in full control. You can pause the round timer, skip an impossible frame, or end the game early at any time."),
    ("scene8_answer_next.mp3", "When time runs out, the movie and trivia are revealed. The host simply clicks Next Round to keep the competition rolling."),
    ("scene9_winner.mp3", "After the final round, the player with the most points is crowned champion on the victory podium! Rematch your friends and play again.")
]

async def generate_narration():
    print(f"Generating 9 Scene Voiceovers with {VOICE}...")
    manifest = []
    total_duration = 0.0

    for idx, (filename, text) in enumerate(SCENE_SCRIPTS, 1):
        out_path = os.path.join(AUDIO_DIR, filename)
        # Natural conversational speed with natural pauses
        communicate = edge_tts.Communicate(text, VOICE, rate="+0%", pitch="+0Hz")
        await communicate.save(out_path)
        
        # Probe exact duration
        cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', out_path]
        dur = float(subprocess.check_output(cmd).decode().strip())
        
        manifest.append({
            "scene": idx,
            "filename": filename,
            "path": out_path,
            "text": text,
            "start": round(total_duration, 3),
            "duration": round(dur, 3),
            "end": round(total_duration + dur, 3)
        })
        print(f"  [{idx}/9] {filename}: {dur:.2f}s (Cumulative: {total_duration:.2f}s -> {total_duration + dur:.2f}s)")
        total_duration += dur

    # Save manifest
    manifest_path = "recordings/sync_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump({"voice": VOICE, "total_duration": round(total_duration, 3), "scenes": manifest}, f, indent=2)
    print(f"Manifest saved to {manifest_path}")

    # Concatenate all into narration_master.mp3
    concat_list = os.path.join(AUDIO_DIR, "concat.txt")
    with open(concat_list, "w", encoding="utf-8") as f:
        for item in manifest:
            f.write(f"file '{item['filename']}'\n")

    master_mp3 = "recordings/narration_master.mp3"
    concat_cmd = ['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_list, '-c:a', 'libmp3lame', '-q:a', '2', master_mp3]
    subprocess.run(concat_cmd, check=True)
    print(f"Master narration audio built: {master_mp3} ({total_duration:.2f}s total)")

if __name__ == "__main__":
    asyncio.run(generate_narration())
