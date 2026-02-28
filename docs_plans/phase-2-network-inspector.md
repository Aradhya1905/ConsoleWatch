# Phase 2: Network Inspector ✅ IMPLEMENTED

> **Goal**: Add comprehensive network request/response monitoring with detailed inspection
>
> **Status**: COMPLETE - Network inspector is fully implemented with modern UI in editor window

---

## Scope

### 2.1 Network Event Handling
- Define `NetworkEvent` message schema with:
  - Request: URL, method, headers, body
  - Response: status, headers, body, size
  - Timing: duration, timestamps
- Handle request start/end correlation via `requestId`
- Calculate timing metrics

### 2.2 Network UI Components
- `NetworkEvent` item component with:
  - Method badge (GET=green, POST=blue, PUT=orange, DELETE=red, PATCH=purple)
  - Status code with color (2xx=green, 4xx=amber, 5xx=red)
  - URL (truncated with full URL on hover)
  - Duration in milliseconds
  - Response size (formatted: bytes, KB, MB)
  - Timeline bar visualization

### 2.3 Network Detail Panel
- `NetworkDetail` component with tabbed interface:
  - **Headers tab**: Request & Response headers (collapsible sections)
  - **Request tab**: Request body (formatted JSON/form data)
  - **Response tab**: Response body (syntax highlighted JSON)
  - **Timing tab**: Duration breakdown visualization
  - **cURL tab**: Export as cURL command

### 2.4 Tab Navigation
- Add `TabBar` component to switch between:
  - All (combined view)
  - Console
  - Network
- Show event count badges per tab

### 2.5 Client Snippet (Network)
- Patch `fetch` API:
  - Capture request URL, method, headers, body
  - Capture response status, headers, body
  - Calculate duration
  - Handle streaming responses
- Patch `XMLHttpRequest`:
  - Intercept open, send methods
  - Capture complete request/response cycle
- Redact sensitive headers (Authorization)

---

## File Structure (IMPLEMENTED)

```
src/webview/
├── components/
│   ├── layout/
│   │   ├── Header.tsx              # Updated with modern branding
│   │   ├── TabBar.tsx              # ✅ IMPLEMENTED - All/Console/Network tabs
│   │   └── StatusBar.tsx
│   ├── events/
│   │   ├── EventList.tsx           # Updated with tab filtering
│   │   ├── ConsoleEvent.tsx
│   │   └── NetworkEvent.tsx        # ✅ IMPLEMENTED - Network request display
│   ├── details/
│   │   └── NetworkDetail.tsx       # ✅ IMPLEMENTED - Tabbed detail panel
│   └── shared/
│       ├── JsonTree.tsx
│       └── Badge.tsx
├── utils/
│   ├── formatters.ts               # ✅ IMPLEMENTED - bytes, duration, URL formatting
│   ├── curlGenerator.ts            # ✅ IMPLEMENTED - cURL command generation
│   ├── vscodeApi.ts
│   └── timeAgo.ts
└── styles/
    └── index.css                   # Updated with modern GitHub-inspired theme

src/extension/
├── extension.ts                    # Updated for editor window
├── ConsoleWatchPanel.ts            # ✅ NEW - WebviewPanel (not sidebar)
└── server/
    └── WebSocketServer.ts

client/
└── consolewatch-client.ts          # ✅ UPDATED - fetch + XMLHttpRequest patching
```

---

## User Acceptance Test

### How to verify Phase 2 is complete:

1. **Fetch Request Capture**
   - In your client app, make a fetch request:
     ```javascript
     fetch('https://jsonplaceholder.typicode.com/users')
       .then(res => res.json())
       .then(console.log)
     ```
   - Network request should appear in the panel with:
     - Green "GET" badge
     - "200" status in green
     - URL displayed
     - Duration in ms
     - Response size

2. **POST Request with Body**
   - Make a POST request:
     ```javascript
     fetch('https://jsonplaceholder.typicode.com/posts', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ title: 'Test', body: 'Content' })
     })
     ```
   - Should show blue "POST" badge
   - Request body should be visible in details

3. **Detail Panel**
   - Click on any network event
   - Detail panel should expand below
   - Verify all tabs work:
     - Headers: Shows request and response headers
     - Request: Shows request body (if any)
     - Response: Shows response JSON with syntax highlighting
     - cURL: Shows valid cURL command

4. **cURL Export**
   - Click "Copy cURL" button
   - Paste in terminal and execute
   - Should make the same request successfully

5. **Error Responses**
   - Trigger a 404 or 500 error
   - Status should show in amber/red color
   - Error details visible in response

6. **Tab Navigation**
   - Click "Console" tab - only console logs visible
   - Click "Network" tab - only network requests visible
   - Click "All" tab - both types visible
   - Verify count badges update correctly

7. **XMLHttpRequest Capture**
   - If your app uses XHR, verify those requests are captured too

---

## Success Criteria

- [ ] All fetch requests are captured
- [ ] All XHR requests are captured
- [ ] Request/response headers are displayed
- [ ] Request/response bodies are formatted JSON
- [ ] Duration is accurate (±10ms)
- [ ] Response size is correct
- [ ] Method badges are color-coded
- [ ] Status codes are color-coded
- [ ] cURL export produces working commands
- [ ] Tab navigation works correctly
- [ ] Detail panel expands/collapses smoothly
- [ ] Authorization headers are redacted
