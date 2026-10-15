const { spawnSync } = require('child_process');

const collections = [
  { id: 'players', name: 'Players' },
  { id: 'game_state', name: 'GameState' },
  { id: 'match_history', name: 'MatchHistory' }
];

for (const col of collections) {
  console.log(`Updating permissions for ${col.id}...`);
  const res = spawnSync('appwrite.cmd', [
    'databases', 'update-collection',
    '--database-id', 'guess_the_frame',
    '--collection-id', col.id,
    '--name', col.name,
    '--permissions', 'read(\\"any\\")',
    '--permissions', 'create(\\"any\\")',
    '--permissions', 'update(\\"any\\")',
    '--permissions', 'delete(\\"any\\")'
  ], { encoding: 'utf8', shell: true });

  if (res.error) {
    console.error(`Error on ${col.id}:`, res.error);
  } else {
    console.log(`Result for ${col.id}:`, res.stdout || res.stderr);
  }
}
