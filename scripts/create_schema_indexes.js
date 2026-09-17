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
  const indexes = [
    `appwrite databases create-index --database-id ${dbId} --collection-id rooms --key idx_roomCode --type key --attributes roomCode --json`,
    `appwrite databases create-index --database-id ${dbId} --collection-id rooms --key idx_status --type key --attributes status --json`,
    `appwrite databases create-index --database-id ${dbId} --collection-id players --key idx_roomId --type key --attributes roomId --json`,
    `appwrite databases create-index --database-id ${dbId} --collection-id players --key idx_playerRoom --type key --attributes playerId --attributes roomId --json`,
    `appwrite databases create-index --database-id ${dbId} --collection-id game_state --key idx_gameStateRoom --type key --attributes roomId --json`,
    `appwrite databases create-index --database-id ${dbId} --collection-id match_history --key idx_matchRoom --type key --attributes roomId --json`
  ];

  for (const cmd of indexes) {
    run(cmd);
    await sleep(1200);
  }

  console.log('ALL INDEXES CREATED!');
}

main();
