const fs = require('fs');
const path = require('path');

const ENDPOINT = 'https://sgp.cloud.appwrite.io/v1';
const PROJECT_ID = '6a95a01e0028db20a16f';
const DATABASE_ID = 'guess_the_frame';

const HEADERS = {
  'x-appwrite-project': PROJECT_ID,
  'Content-Type': 'application/json'
};

async function fetchAllDocuments(collectionId) {
  let allDocs = [];
  let offset = 0;
  const limit = 100;
  
  while (true) {
    const q0 = encodeURIComponent(JSON.stringify({ method: 'limit', values: [limit] }));
    const q1 = encodeURIComponent(JSON.stringify({ method: 'offset', values: [offset] }));
    const url = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${collectionId}/documents?queries[0]=${q0}&queries[1]=${q1}`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
      console.warn(`Failed to fetch ${collectionId}: ${res.status}`);
      break;
    }
    const data = await res.json();
    const docs = data.documents || [];
    allDocs.push(...docs);
    if (docs.length < limit || allDocs.length >= (data.total || 0)) {
      break;
    }
    offset += limit;
  }
  return allDocs;
}

async function performBackup() {
  console.log('Starting Appwrite Database Backup...');
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Database: ${DATABASE_ID}`);

  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup_${DATABASE_ID}_${timestamp}.json`);

  const collections = ['rooms', 'players', 'game_state', 'match_history'];
  const snapshot = {
    metadata: {
      projectId: PROJECT_ID,
      databaseId: DATABASE_ID,
      timestamp: new Date().toISOString(),
      generator: 'ScoopCast Production Backup Utility v1.0'
    },
    collections: {}
  };

  for (const col of collections) {
    console.log(`Snapshotting collection: ${col}...`);
    const docs = await fetchAllDocuments(col);
    snapshot.collections[col] = {
      count: docs.length,
      documents: docs
    };
    console.log(`  ✓ Saved ${docs.length} documents from "${col}"`);
  }

  fs.writeFileSync(backupFile, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`\n✅ Backup complete! Saved snapshot to:`);
  console.log(`   ${backupFile}`);

  // Also write the latest pointer
  const latestFile = path.join(backupDir, `backup_${DATABASE_ID}_latest.json`);
  fs.writeFileSync(latestFile, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`   ${latestFile} (updated pointer)\n`);
}

performBackup().catch(err => {
  console.error('Backup error:', err);
  process.exit(1);
});
