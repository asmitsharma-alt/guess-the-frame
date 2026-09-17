import { Client, Databases, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  try {
    const serverKey = req.headers['x-appwrite-key'] || process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';
    const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT || 'https://sgp.cloud.appwrite.io/v1';
    const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID || '6a95a01e0028db20a16f';
    const databaseId = 'guess_the_frame';

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId);

    if (serverKey) {
      client.setKey(serverKey);
    }

    const databases = new Databases(client);

    // 24 hours retention cutoff
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000);
    log(`[Cleanup] Scanning for abandoned/finished rooms older than ${new Date(cutoffTime).toISOString()}...`);

    // Fetch finished or abandoned rooms
    let roomsToClean = [];
    try {
      const finishedRooms = await databases.listDocuments(databaseId, 'rooms', [
        Query.equal('status', ['finished', 'abandoned']),
        Query.lessThan('updatedAt', cutoffTime),
        Query.limit(50)
      ]);
      roomsToClean = finishedRooms.documents || [];
    } catch (queryErr) {
      // Fallback: list recent rooms and filter by status and updatedAt in code
      log(`[Cleanup] Indexed query fallback: ${queryErr.message}`);
      const recentRooms = await databases.listDocuments(databaseId, 'rooms', [
        Query.limit(100)
      ]);
      roomsToClean = (recentRooms.documents || []).filter(r => 
        (r.status === 'finished' || r.status === 'abandoned') && 
        ((r.updatedAt || r.createdAt || 0) < cutoffTime)
      );
    }

    let deletedRooms = 0;
    let deletedPlayers = 0;
    let deletedGameStates = 0;

    for (const room of roomsToClean) {
      const roomId = room.roomId || room.$id;
      log(`[Cleanup] Purging expired room: ${roomId} (status: ${room.status})`);

      // 1. Delete associated player sessions
      try {
        const playerList = await databases.listDocuments(databaseId, 'players', [
          Query.equal('roomId', roomId),
          Query.limit(100)
        ]);
        for (const p of (playerList.documents || [])) {
          await databases.deleteDocument(databaseId, 'players', p.$id).catch(() => {});
          deletedPlayers++;
        }
      } catch (pErr) {
        log(`[Cleanup] Error listing players for ${roomId}: ${pErr.message}`);
      }

      // 2. Delete game_state doc
      try {
        await databases.deleteDocument(databaseId, 'game_state', roomId).catch(() => {});
        deletedGameStates++;
      } catch (gsErr) {}

      // 3. Delete room doc
      try {
        await databases.deleteDocument(databaseId, 'rooms', room.$id).catch(() => {});
        deletedRooms++;
      } catch (rErr) {
        error(`[Cleanup] Error deleting room ${room.$id}: ${rErr.message}`);
      }

      // CRITICAL: match_history records are NEVER touched or deleted!
    }

    const summary = {
      success: true,
      cutoffTime: new Date(cutoffTime).toISOString(),
      deletedRooms,
      deletedPlayers,
      deletedGameStates,
      matchHistoryPreserved: true,
      timestamp: Date.now()
    };

    log(`[Cleanup Complete] ${JSON.stringify(summary)}`);
    return res.json(summary);
  } catch (err) {
    error(`[Cleanup Error] ${err.message}`);
    return res.json({ success: false, error: err.message }, 500);
  }
};
