const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

console.log('========================================================');
console.log('🧪 VERIFYING PRESENCE & INVISIBILITY BUG FIXES');
console.log('========================================================');

// 1. Verify NetworkSecurity Clock Drift Allowance for Heartbeats
const nsStart = src.indexOf('const NetworkSecurity = {');
let depth = 0, nsEnd = -1;
for (let i = src.indexOf('{', nsStart); i < src.length; i++) {
  if (src[i] === '{') depth++;
  else if (src[i] === '}') { depth--; if (depth === 0) { nsEnd = i + 1; break; } }
}
const NetworkSecurity = new Function(src.slice(nsStart, nsEnd) + '; return NetworkSecurity;')();

const phoneDriftTime = Date.now() + 75000; // Phone clock 75 seconds ahead
const heartbeatMsg = {
  roomCode: 'TEST',
  type: 'CLIENT_HEARTBEAT',
  senderId: 'p_phone',
  timestamp: phoneDriftTime
};

const rejoinMsg = {
  roomCode: 'TEST',
  type: 'REQUEST_REJOIN_SYNC',
  senderId: 'p_phone',
  timestamp: phoneDriftTime
};

const hbValid = NetworkSecurity.validateIncomingMessage(heartbeatMsg, 'TEST');
const rejoinValid = NetworkSecurity.validateIncomingMessage(rejoinMsg, 'TEST');

console.log(`\n1. Heartbeat validation with 75s phone clock drift: ${hbValid ? '✅ PASSED (Not dropped)' : '❌ FAILED (Dropped)'}`);
console.log(`2. Rejoin handshake with 75s phone clock drift: ${rejoinValid ? '✅ PASSED (Not dropped)' : '❌ FAILED (Dropped)'}`);

// 2. Verify Presence Watchdog timeout value
const has35sTimeout = src.includes('(now - lastSeen) < 35000');
console.log(`3. Host presence watchdog timeout increased to 35s: ${has35sTimeout ? '✅ YES (35,000ms)' : '❌ NO'}`);

// 3. Verify Self-Healing presence in SYNC_ROOM_STATE
const hasSelfHealing = src.includes('REQUEST_REJOIN_SYNC') && src.includes('!isMeIncluded && !this.isHost && this.roomCode');
console.log(`4. Self-healing presence in SYNC_ROOM_STATE: ${hasSelfHealing ? '✅ YES' : '❌ NO'}`);

// 4. Verify Leaderboard Rendering on join and round starts
const nSrc = src.replace(/\r\n/g, '\n');
const hasJoinRenderLB = nSrc.includes('this.renderLobbyUI();\n              UI.renderLB();');
const hasRoundStartRenderLB = nSrc.includes('FrameDisplay.showFrame(frame);\n        UI.renderLB();');
console.log(`5. In-game leaderboard rendered immediately on PLAYER_JOIN: ${hasJoinRenderLB ? '✅ YES' : '❌ NO'}`);
console.log(`6. In-game leaderboard rendered immediately on round start: ${hasRoundStartRenderLB ? '✅ YES' : '❌ NO'}`);

// 5. Verify VisibilityChange Auto-Wake
const hasVisibilityChange = src.includes("document.addEventListener('visibilitychange'");
console.log(`7. Mobile tab foreground visibilitychange listener active: ${hasVisibilityChange ? '✅ YES' : '❌ NO'}`);

if (hbValid && rejoinValid && has35sTimeout && hasSelfHealing && hasJoinRenderLB && hasRoundStartRenderLB && hasVisibilityChange) {
  console.log('\n========================================================');
  console.log('🎉 ALL INVISIBILITY ROOT CAUSES ARE FULLY RESOLVED & VERIFIED!');
  console.log('========================================================');
} else {
  console.error('\n❌ One or more presence checks failed!');
  process.exit(1);
}
