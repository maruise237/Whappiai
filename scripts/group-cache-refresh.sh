#!/bin/bash
# Refresh group cache in PostgreSQL every 5 minutes
# Runs inside the Whappi Docker container via crontab.
CONTAINER="whappi-whappi-sypalq-whappi-frontend-1"

# Write the refresh script into the container  
sudo docker exec "$CONTAINER" sh -c 'cat > /tmp/group-refresh.js << '\''NODESCRIPT'\''
const { createWhatsAppProvider } = require("/app/src/services/providers");
const GroupCache = require("/app/src/services/GroupCacheService");
const db = require("/app/src/db/query");

(async () => {
  const rows = await db.all("SELECT id FROM whatsapp_sessions");
  const sessions = rows.map(r => r.id);
  const provider = createWhatsAppProvider();
  for (const sid of sessions) {
    const start = Date.now();
    await GroupCache.refreshGroups(sid, provider);
    console.log("refreshed", sid, Date.now() - start + "ms");
  }
  console.log("done -", sessions.length, "sessions");
})().catch(e => { console.error("fatal:", e.message); process.exit(1); });
NODESCRIPT'

# Run the refresh from /app so require paths resolve
sudo docker exec "$CONTAINER" sh -c 'cd /app && node /tmp/group-refresh.js' 2>&1 | logger -t group-refresh
