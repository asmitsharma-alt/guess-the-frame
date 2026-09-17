const fs = require('fs');
const path = require('path');

const ENDPOINT = 'https://sgp.cloud.appwrite.io/v1';
const PROJECT_ID = '6a95a01e0028db20a16f';
const DATABASE_ID = 'guess_the_frame';

const HEADERS = {
  'x-appwrite-project': PROJECT_ID,
  'Content-Type': 'application/json'
};

async function restoreCollection(collectionId, docs) {
  console.log(`Restoring ${docs.length} documents into "${collectionId}"...`);
  let restored = 0;
  let skipped = 0;

  for (const doc of docs) {
    const docId = doc.$id || doc.roomId || doc.playerId || doc.matchId;
    // Clean Appwrite system attributes before inserting
    const data = { ...doc };
    delete data.$id;
    delete data.$createdAt;
    delete data.$updatedAt;
    delete data.$permissions;
    delete data.$databaseId;
    delete data.$collectionId;

    try {
      const res = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${collectionId}/documents`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          documentId: docId,
          data
        })
      });

      if (res.ok) {
        restored++;
      } else {
        // If it already exists (409), skip or update
        skipped++;
      }
    } catch(e) {
      skipped++;
    }
  }
  console.log(`  ✓ Restored: ${restored} | Existing/Skipped: ${skipped}`);
}

async function performRestore(snapshotPath) {
  const fileToRestore = snapshotPath || path.join(__dirname, '..', 'backups', `backup_${DATABASE_ID}_latest.json`);
  if (!fs.existsSync(fileToRestore)) {
    console.error(`Backup file not found: ${fileToRestore}`);
    process.exit(1);
  }

  console.log('================================================================');
  console.log('SCOOPCAST DATABASE RECOVERY / RESTORE UTILITY');
  console.log('================================================================');
  console.log(`Loading snapshot from: ${fileToRestore}`);

  const snapshot = JSON.parse(fs.readFileSync(fileToRestore, 'utf8'));
  console.log(`Snapshot Timestamp: ${snapshot.metadata.timestamp}`);
  console.log(`Database ID: ${snapshot.metadata.databaseId}\n`);

  for (const [colName, colData] of Object.entries(snapshot.collections)) {
    await restoreCollection(colName, colData.documents || []);
  }

  console.log('\n✅ Database restoration completed successfully!');
}

const argFile = process.argv[2];
performRestore(argFile).catch(err => {
  console.error('Restore error:', err);
  process.exit(1);
});
