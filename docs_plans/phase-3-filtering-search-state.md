# Phase 3: Filtering, Search & State Inspector

> **Goal**: Add powerful filtering capabilities and Redux/Zustand state tracking
>
> **Note**: Building on Phase 1-2, the UI is displayed in an **editor window** (WebviewPanel), not sidebar

---

## Scope

### 3.1 Filter System
- **Type Filters**: Toggle visibility of event types (Console, Network, State)
- **Console Level Filters**: Log, Warn, Error, Info, Debug
- **Network Method Filters**: GET, POST, PUT, DELETE, PATCH
- **Status Code Filters**: 2xx, 3xx, 4xx, 5xx
- Filter state persistence (remember selections)
- Active filter badges showing current filters

### 3.2 Search Implementation
- Global search across all event content
- Debounced input (300ms) for performance
- Highlight matching text in results
- Clear search button
- Search history (last 5 searches)
- Keyboard shortcut: Cmd/Ctrl + F to focus

### 3.3 Filter Bar UI
- `FilterBar` component with:
  - Quick toggle buttons for log levels
  - Dropdown for method filters
  - Dropdown for status code filters
  - Sort order toggle (newest/oldest first)
  - "Clear All Filters" button

### 3.4 State Inspector
- Define `StateEvent` message schema:
  - Action type/name
  - Previous state
  - Next state
  - Action payload
- State diff calculation (what changed)
- `StateEvent` item component
- `StateDetail` panel with:
  - Action info
  - Diff view (before → after) with color highlighting
  - Full state tree explorer (collapsible)
  - Action payload viewer

### 3.5 Client Snippet (State)
- Redux middleware (~15 lines):
  - Capture action type and payload
  - Capture prev/next state
  - Send to DevPulse
- Zustand middleware example
- Generic state logging API

### 3.6 State Tab
- Add "State" tab to TabBar
- State-specific filters (action types)

---

## File Structure Additions

```
src/webview/
├── components/
│   ├── layout/
│   │   └── FilterBar.tsx           # NEW
│   ├── events/
│   │   └── StateEvent.tsx          # NEW
│   ├── details/
│   │   └── StateDetail.tsx         # NEW
│   └── shared/
│       ├── SearchInput.tsx         # NEW
│       ├── FilterDropdown.tsx      # NEW
│       ├── DiffView.tsx            # NEW
│       └── FilterBadge.tsx         # NEW
├── store/
│   └── filterStore.ts              # NEW
└── hooks/
    ├── useSearch.ts                # NEW
    └── useFilters.ts               # NEW

client/
├── devpulse-client.ts              # UPDATED
├── redux-middleware.ts             # NEW (example)
└── zustand-middleware.ts           # NEW (example)
```

---

## User Acceptance Test

### How to verify Phase 3 is complete:

1. **Search Functionality**
   - Generate some logs with text: `console.log("user logged in")`
   - Type "logged" in search box
   - Only matching logs should appear
   - Matching text should be highlighted
   - Press Escape to clear search

2. **Console Level Filters**
   - Click on "Warn" filter to toggle off
   - `console.warn()` messages should disappear
   - Click again to toggle back on
   - Messages should reappear

3. **Network Method Filters**
   - Open method filter dropdown
   - Uncheck "GET"
   - All GET requests should be hidden
   - Only POST/PUT/DELETE visible

4. **Status Code Filters**
   - Uncheck "2xx" status filter
   - All successful requests hidden
   - Only errors (4xx, 5xx) visible

5. **Clear All Filters**
   - Apply multiple filters
   - Click "Clear All"
   - All events should be visible again

6. **Redux State Tracking** (if using Redux)
   - Add DevPulse middleware to your Redux store:
     ```javascript
     import { devpulseMiddleware } from 'devpulse-client';
     const store = configureStore({
       reducer: rootReducer,
       middleware: (getDefault) => getDefault().concat(devpulseMiddleware)
     });
     ```
   - Dispatch an action in your app
   - Action should appear in "State" tab
   - Click to see:
     - Action type and payload
     - State diff (what changed)
     - Full state tree

7. **State Diff View**
   - After a state change, click on the state event
   - Diff view should show:
     - Added properties in green
     - Removed properties in red
     - Changed values with before/after

8. **Zustand State Tracking** (if using Zustand)
   - Apply middleware to your store
   - State changes should appear similar to Redux

9. **Combined View**
   - Switch to "All" tab
   - Console, Network, and State events should all be visible
   - Filters should still work across all types

10. **Filter Persistence**
    - Apply some filters
    - Close and reopen the panel
    - Filters should still be applied

---

## Success Criteria

- [ ] Search finds matches across all event content
- [ ] Search is performant (< 50ms for 1000 events)
- [ ] Console level filters work correctly
- [ ] Network method filters work correctly
- [ ] Status code filters work correctly
- [ ] Multiple filters combine correctly (AND logic)
- [ ] Clear all filters works
- [ ] Redux actions are captured with state diff
- [ ] Zustand mutations are captured
- [ ] State diff view shows changes clearly
- [ ] Full state tree is explorable
- [ ] Filter state persists across panel reopen
- [ ] Cmd/Ctrl + F focuses search
