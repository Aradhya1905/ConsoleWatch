# Phase 1: Foundation & Console Logging

> **Goal**: Establish the core infrastructure and deliver the first visible feature - console logging

---

## Scope

### 1.1 Project Setup
- Initialize VSCode extension project structure
- Configure TypeScript with strict mode
- Set up esbuild for fast builds
- Configure Tailwind CSS for webview styling
- Set up ESLint and Prettier

### 1.2 WebSocket Server
- Implement `DevPulseServer` class with:
  - Start/stop functionality
  - Client connection handling
  - JSON message parsing
  - Heartbeat/ping-pong for connection health
  - Event emission for incoming messages

### 1.3 Editor Window Panel (NOT Sidebar)
- Create `ConsoleWatchPanel` class using `vscode.WebviewPanel` (opens as editor tab)
- **Important**: Uses WebviewPanel (editor area) NOT WebviewViewProvider (sidebar) for better UX
- Set up React 19 with TypeScript
- Implement VSCode ↔ Webview communication bridge
- Apply modern elegant dark theme styling (GitHub-inspired color palette)
- Create layout structure (Header, TabBar, EventList, StatusBar)
- Auto-opens panel on extension activation with keyboard shortcut (Ctrl/Cmd+Shift+C)

### 1.4 Console Event System
- Define `ConsoleEvent` message schema
- Create in-memory event store with Zustand
- Implement event forwarding from server to webview
- Set max events limit (1000)

### 1.5 Console UI Components
- `EventList` - scrollable list of events
- `ConsoleEvent` - individual console log display
- Color-coded log levels (log=blue, warn=amber, error=red)
- Expandable JSON preview with `JsonTree` component
- Relative timestamp display ("2s ago")
- Copy to clipboard functionality

### 1.6 Client Snippet (Console)
- Create client SDK with console patching
- Intercept `console.log`, `console.warn`, `console.error`, `console.info`, `console.debug`
- Handle circular references in objects
- WebSocket connection with auto-reconnect

---

## File Structure for Phase 1

```
consolewatch/
├── package.json
├── tsconfig.json
├── tsconfig.webview.json
├── esbuild.config.js
├── src/
│   ├── extension/
│   │   ├── extension.ts                    # Entry point, registers commands
│   │   ├── ConsoleWatchPanel.ts           # WebviewPanel class (editor window)
│   │   └── server/
│   │       └── WebSocketServer.ts
│   ├── webview/
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx              # Modern header with branding
│   │   │   │   ├── TabBar.tsx              # Tab navigation (All/Console/Network)
│   │   │   │   └── StatusBar.tsx
│   │   │   ├── events/
│   │   │   │   ├── EventList.tsx
│   │   │   │   └── ConsoleEvent.tsx
│   │   │   └── shared/
│   │   │       ├── JsonTree.tsx
│   │   │       └── Badge.tsx
│   │   ├── store/
│   │   │   └── eventStore.ts
│   │   ├── hooks/
│   │   │   └── useVSCodeMessage.ts
│   │   ├── utils/
│   │   │   ├── vscodeApi.ts
│   │   │   └── timeAgo.ts
│   │   └── styles/
│   │       └── index.css                   # Modern GitHub-inspired theme
│   └── shared/
│       └── types.ts
└── client/
    └── consolewatch-client.ts
```

---

## User Acceptance Test

### How to verify Phase 1 is complete:

1. **Extension Activation**
   - Open VSCode with the extension installed
   - Run command: "DevPulse: Open Panel"
   - Panel should open showing "Disconnected" status

2. **Client Connection**
   - In a React/React Native app, add the client snippet
   - Start your app
   - Extension should show "Connected" status with green indicator

3. **Console Logging**
   - In your client app, run: `console.log("Hello DevPulse")`
   - Log should appear in the panel immediately
   - Test all levels: `console.log`, `console.warn`, `console.error`, `console.info`

4. **JSON Expansion**
   - Log an object: `console.log({ user: { name: "John", age: 30 } })`
   - Click to expand and see the nested JSON tree

5. **Copy Functionality**
   - Hover over a log entry
   - Click the copy button
   - Paste elsewhere to verify content

6. **Performance Check**
   - Run a loop: `for(let i=0; i<100; i++) console.log(i)`
   - All 100 logs should appear without freezing

---

## Success Criteria

- [ ] Extension activates in < 500ms
- [ ] WebSocket server starts on port 9090
- [ ] Client connects successfully
- [ ] Console logs appear in real-time (< 100ms latency)
- [ ] All 5 log levels are color-coded correctly
- [ ] JSON objects are expandable
- [ ] Copy to clipboard works
- [ ] UI scrolls smoothly with 100+ events
- [ ] Reconnection works after client restart
