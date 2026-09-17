const { execSync } = require('child_process');

const dbId = 'guess_the_frame';

function run(cmd) {
  console.log(`> ${cmd}`);
  try {
    const out = execSync(cmd, { encoding: 'utf8' });
    console.log('SUCCESS');
  } catch (err) {
    console.error(`ERROR: ${err.stderr || err.message}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const commands = [
    // rooms
    `appwrite databases create-string-attribute --database-id ${dbId} --collection-id rooms --key status --size 32 --required=false --xdefault lobby --json`,
    `appwrite databases create-string-attribute --database-id ${dbId} --collection-id rooms --key currentSection --size 32 --required=false --xdefault frames --json`,
    `appwrite databases create-integer-attribute --database-id ${dbId} --collection-id rooms --key timer --required=false --xdefault 30 --json`,
    `appwrite databases create-integer-attribute --database-id ${dbId} --collection-id rooms --key totalRounds --required=false --xdefault 40 --json`,
    `appwrite databases create-string-attribute --database-id ${dbId} --collection-id rooms --key categories --size 255 --required=false --xdefault "frames,eyes,dialogue" --json`,
    `appwrite databases create-integer-attribute --database-id ${dbId} --collection-id rooms --key createdAt --required=false --xdefault 0 --json`,
    `appwrite databases create-integer-attribute --database-id ${dbId} --collection-id rooms --key updatedAt --required=false --xdefault 0 --json`,

    // players
    `appwrite databases create-string-attribute --database-id ${dbId} --collection-id players --key avatar --size 64 --required=false --xdefault aman --json`,
    `appwrite databases create-string-attribute --database-id ${dbId} --collection-id players --key status --size 32 --required=false --xdefault connected --json`,
    `appwrite databases create-integer-attribute --database-id ${dbId} --collection-id players --key lastHeartbeat --required=false --xdefault 0 --json`,
    `appwrite databases create-integer-attribute --database-id ${dbId} --collection-id players --key score --required=false --xdefault 0 --json`,
    `appwrite databases create-boolean-attribute --database-id ${dbId} --collection-id players --key isHost --required=false --xdefault=false --json`,
    `appwrite databases create-string-attribute --database-id ${dbId} --collection-id players --key color --size 32 --required=false --xdefault "#57c3e0" --json`,

    // game_state
    `appwrite databases create-integer-attribute --database-id ${dbId} --collection-id game_state --key roundNumber --required=false --xdefault 1 --json`,
    `appwrite databases create-string-attribute --database-id ${dbId} --collection-id game_state --key phase --size 32 --required=false --xdefault guessing --json`,
    `appwrite databases create-string-attribute --database-id ${dbId} --collection-id game_state --key currentImage --size 1024 --required=false --xdefault "" --json`,
    `appwrite databases create-string-attribute --database-id ${dbId} --collection-id game_state --key dialogueText --size 1024 --required=false --xdefault "" --json`,
    `appwrite databases create-string-attribute --database-id ${dbId} --collection-id game_state --key dialogueContext --size 255 --required=false --xdefault "" --json`,
    `appwrite databases create-string-attribute --database-id ${dbId} --collection-id game_state --key maskedHint --size 255 --required=false --xdefault "" --json`,
    `appwrite databases create-string-attribute --database-id ${dbId} --collection-id game_state --key revealedAnswer --size 255 --required=false --xdefault "" --json`,
    `appwrite databases create-string-attribute --database-id ${dbId} --collection-id game_state --key winners --size 4096 --required=false --xdefault "[]" --json`,
    `appwrite databases create-integer-attribute --database-id ${dbId} --collection-id game_state --key startedAt --required=false --xdefault 0 --json`,
    `appwrite databases create-integer-attribute --database-id ${dbId} --collection-id game_state --key version --required=false --xdefault 1 --json`,

    // match_history
    `appwrite databases create-string-attribute --database-id ${dbId} --collection-id match_history --key players --size 4096 --required=false --xdefault "[]" --json`,
    `appwrite databases create-string-attribute --database-id ${dbId} --collection-id match_history --key scores --size 4096 --required=false --xdefault "{}" --json`
  ];

  for (const cmd of commands) {
    run(cmd);
    await sleep(800);
  }

  console.log('ALL REMAINING ATTRIBUTES CREATED!');
}

main();
