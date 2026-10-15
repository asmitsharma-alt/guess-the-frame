import asyncio
import os
import edge_tts

AUDIO_DIR = "recordings/audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

VOICE = "en-US-GuyNeural" # Clean, friendly, engaging male voice

# Scripts for each scene with timestamp guidance
SCENE_SCRIPTS = [
    ("scene1_home.mp3", "Welcome to Guess The Frame! Gather your friends and get ready to test your movie knowledge. Click Host a Room to get started."),
    ("scene2_avatar.mp3", "Enter your player name, choose your favorite animated avatar, and create your room."),
    ("scene3_lobby.mp3", "Invite your friends! They can enter the four-letter room code or scan the QR code on their phone to join your lobby in real time."),
    ("scene4_guide.mp3", "Learn the game in ten seconds: Watch the frame, type your movie guess—typos are forgiven—and score points!"),
    ("scene5_gameplay.mp3", "Round one is live! Type your guess in the chat stream. Correct answers score points immediately. Stuck? Tap the hint button to reveal letter clues."),
    ("scene6_scoring.mp3", "The answer is revealed! The host awards points to the winners on the scoring grid."),
    ("scene7_victory.mp3", "Victory! Celebrate on the champion podium with confetti and challenge your crew to a rematch!")
]

async def generate_all():
    print("Generating voice narration with Edge-TTS...")
    for filename, text in SCENE_SCRIPTS:
        out_path = os.path.join(AUDIO_DIR, filename)
        communicate = edge_tts.Communicate(text, VOICE, rate="+4%")
        await communicate.save(out_path)
        print(f"  Generated: {filename}")

if __name__ == "__main__":
    asyncio.run(generate_all())
