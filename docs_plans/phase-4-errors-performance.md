# Phase 4: Error Tracking & Performance Features

> **Goal**: Comprehensive error capture with stack traces and performance benchmarking
>
> **Note**: Building on Phase 1-3, the UI is displayed in an **editor window** (WebviewPanel), not sidebar

---

## Scope

### 4.1 Error Event Handling
- Define `ErrorEvent` message schema:
  - Error message
  - Error name/type
  - Stack trace
  - Source file, line, column
  - Component stack (React)
  - First seen / last seen timestamps
  - Occurrence count
- Error grouping logic (similar errors grouped together)
- Error deduplication

### 4.2 Error UI Components
- `ErrorEvent` item component:
  - Red accent color
  - Error message (truncated)
  - Error type badge (TypeError, ReferenceError, etc.)
  - Occurrence count badge
  - Relative time since first/last occurrence
- Error stack trace display:
  - Formatted stack frames
  - File links (clickable to open in VSCode)
  - Collapsible full trace

### 4.3 Error Detail Panel
- `ErrorDetail` component with:
  - Full error message
  - Parsed stack trace with clickable file links
  - React component stack (if available)
  - "Copy Error Report" button (formatted for bug reports)
  - "Mark as Resolved" action (hides from list)
  - Similar errors grouped

### 4.4 Client Snippet (Errors)
- `window.onerror` handler for uncaught errors
- `unhandledrejection` handler for Promise rejections
- React Error Boundary integration hook
- Source map hint (file:line:column)
- Custom error logging API

### 4.5 Performance Benchmarks
- Define `BenchmarkEvent` message schema:
  - Benchmark name
  - Duration in ms
  - Category/tag
- `BenchmarkEvent` item component:
  - Duration bar visualization
  - Duration value
- Simple stats display (avg, min, max)

### 4.6 Client Benchmark API
- `devpulse.benchmark(name)` returns a stop function:
  ```javascript
  const stop = devpulse.benchmark("loadData");
  await fetchData();
  stop(); // sends duration to DevPulse
  ```
- Automatic `console.time`/`timeEnd` capture

### 4.7 Errors Tab
- Add "Errors" tab to TabBar with count badge (unresolved only)
- Error-specific filters (error type, resolved/unresolved)

---

## File Structure Additions

```
src/webview/
├── components/
│   ├── events/
│   │   ├── ErrorEvent.tsx          # NEW
│   │   └── BenchmarkEvent.tsx      # NEW
│   ├── details/
│   │   └── ErrorDetail.tsx         # NEW
│   └── shared/
│       ├── StackTrace.tsx          # NEW
│       └── DurationBar.tsx         # NEW
├── utils/
│   ├── stackParser.ts              # NEW
│   └── errorGrouper.ts             # NEW
└── hooks/
    └── useErrorGroups.ts           # NEW

client/
└── devpulse-client.ts              # UPDATED (add error & benchmark capture)
```

---

## User Acceptance Test

### How to verify Phase 4 is complete:

1. **Uncaught Error Capture**
   - In your client app, throw an error:
     ```javascript
     setTimeout(() => {
       throw new Error("Test uncaught error");
     }, 1000);
     ```
   - Error should appear in DevPulse with:
     - Red styling
     - "Error" type badge
     - Error message visible

2. **Promise Rejection Capture**
   - Trigger an unhandled rejection:
     ```javascript
     Promise.reject(new Error("Unhandled promise rejection"));
     ```
   - Should appear as an error event

3. **Stack Trace Display**
   - Click on an error event
   - Stack trace should be visible
   - Each frame should show:
     - Function name
     - File path
     - Line and column number

4. **Clickable File Links**
   - Click on a stack trace frame
   - VSCode should open the file at that line
   - (Works best with source maps configured)

5. **Error Grouping**
   - Throw the same error multiple times:
     ```javascript
     for (let i = 0; i < 5; i++) {
       console.error("Repeated error");
     }
     ```
   - Should show as one error with count badge "x5"

6. **Copy Error Report**
   - Click "Copy Report" on an error
   - Paste to see formatted bug report including:
     - Error message
     - Stack trace
     - Browser/platform info

7. **Mark as Resolved**
   - Click "Mark Resolved" on an error
   - Error should be hidden or grayed out
   - Error count in tab badge should decrease

8. **Benchmark API**
   - Use the benchmark API in your app:
     ```javascript
     const stop = devpulse.benchmark("API Call");
     await fetch('https://api.example.com/data');
     stop();
     ```
   - Benchmark should appear showing duration

9. **console.time Capture**
   - Use native console timing:
     ```javascript
     console.time("render");
     // ... some work
     console.timeEnd("render");
     ```
   - Should be captured as a benchmark event

10. **Errors Tab**
    - Click "Errors" tab
    - Only error events should be visible
    - Badge should show unresolved error count

11. **React Error Boundary** (if using React)
    - Trigger a render error in a component
    - Error should be captured with:
      - Component stack
      - Which component tree failed

---

## Success Criteria

- [ ] All uncaught errors are captured
- [ ] Promise rejections are captured
- [ ] Stack traces are parsed and displayed
- [ ] File links open in VSCode (when source maps available)
- [ ] Similar errors are grouped with occurrence count
- [ ] "Mark as Resolved" hides errors
- [ ] Copy Report generates useful bug report
- [ ] Benchmark API measures duration correctly
- [ ] console.time/timeEnd is captured
- [ ] Errors tab shows correct count
- [ ] React component stack is shown (when applicable)
- [ ] Error capture doesn't break app behavior
