import sys

path = 'frontend/src/providers/websocket-provider.tsx'
with open(path, 'r') as f:
    content = f.read()

# Fix WebSocket URL resolution to use API_BASE_URL correctly
old_code = """        if (API_BASE_URL && API_BASE_URL.includes('://')) {
          try {
            const url = new URL(API_BASE_URL)
            const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
            wsUrl = `${protocol}//${url.host}?token=${token}`
          } catch (e) {
            console.error("Invalid API_BASE_URL for WebSocket:", API_BASE_URL)
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
            wsUrl = `${protocol}//${window.location.host}?token=${token}`
          }
        } else {"""

new_code = """        if (API_BASE_URL && API_BASE_URL.includes('://')) {
          try {
            const url = new URL(API_BASE_URL)
            const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
            // For IP-based URLs, url.host includes the port
            wsUrl = `${protocol}//${url.host}/ws?token=${token}`
          } catch (e) {
            console.error("Invalid API_BASE_URL for WebSocket:", API_BASE_URL)
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
            wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`
          }
        } else {"""

content = content.replace(old_code, new_code)

# Ensure fallback also includes /ws if needed (though backend mounts on root, adding /ws is common practice or can be ignored if backend handles root)
# The backend handles root for now, but if it doesn't, we might need a path.
# Let's check index.js again. index.js: const wss = new WebSocketServer({ server }); - It's on root.

with open(path, 'w') as f:
    f.write(content)
