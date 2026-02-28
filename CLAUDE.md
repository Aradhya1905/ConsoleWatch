# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ConsoleWatch is a VS Code extension that provides real-time debugging and observability. It streams logs, network activity, state changes, and custom events from running applications (React, React Native, Flutter, Android, iOS, Node, etc.) into a VS Code webview panel via WebSocket (default port 9090).

## Build & Development Commands

```bash
npm run build          # Clean + full build (extension + webview + CSS)
npm run build:prod     # Production build (minified)
npm run watch          # Watch mode (JS/TS only; CSS changes need manual rebuild)
npm run build:css      # Rebuild Tailwind CSS only
npm run lint           # ESLint (src/**/*.{ts,tsx})
npm run package        # Package as .vsix
npm run clean          # Remove dist/ and .vsix files
```

**Development workflow:** Run `npm run watch` for JS/TS hot-rebuilding during development. After CSS/Tailwind changes, run `npm run build:css` separately. To test, press F5 in VS Code to launch the Extension Development Host.

## Architecture

The project has three distinct layers with separate build targets:

### 1. Extension Host (`src/extension/`) — Node.js / CommonJS
- **extension.ts** — Entry point. Registers commands, manages panel lifecycle, routes messages between WebSocket server and webview.
- **ConsoleWatchPanel.ts** — Creates and manages the webview panel with CSP, loads the React bundle.
- **ConsoleWatchViewProvider.ts** — Activity bar tree view provider.
- **ConsoleWatchClientsTreeDataProvider.ts** — Tree view showing connected clients.
- **server/WebSocketServer.ts** — WS server on port 9090. Accepts client connections, heartbeat monitoring, broadcasts events to the webview via postMessage.

### 2. Webview UI (`src/webview/`) — React 19 / IIFE bundle (browser)
- **App.tsx** — Main component with tab routing (All/Console/Network/State).
- **store/eventStore.ts** — Zustand store. Single source of truth for events (max 1000), connection status, server status, selected event.
- **hooks/useVSCodeMessage.ts** — Listens for postMessage from extension host.
- **utils/vscodeApi.ts** — Bridge to `acquireVsCodeApi()` for sending messages back to extension.
- Components are organized into `layout/`, `events/`, `details/`, and `shared/` subdirectories.

### 3. Shared Types (`src/shared/types.ts`)
Defines the message protocol interfaces used by both extension and webview. Key types: `ConsoleWatchMessage`, `ExtensionToWebviewMessage`, `WebviewToExtensionMessage`.

### Data Flow
```
Client App → WebSocket (port 9090) → Extension Host → postMessage → Webview (Zustand store) → React UI
Webview → postMessage → Extension Host (copy, open-file commands)
```

## Build System

ESBuild bundles two separate targets (configured in `esbuild.config.js`):
- **Extension:** CJS, Node 20, excludes `vscode` module
- **Webview:** IIFE, ES2022, browser platform

CSS is built separately via Tailwind CLI (`@tailwindcss/cli`), not through esbuild. Output goes to `dist/webview/styles.css`.

## Styling

Tailwind CSS 4.0 with a custom dark theme defined via CSS variables in `src/webview/styles/index.css`. Includes semantic color classes for HTTP methods (GET=green, POST=purple, PUT=orange, DELETE=red) and status codes (2xx=green, 3xx=blue, 4xx=yellow, 5xx=red).

## VS Code Extension Points

- Commands: `consolewatch.openPanel` (Ctrl+Shift+C), `consolewatch.clear`, `consolewatch.toggleServer`
- Activity bar container with tree view for connected clients
- Minimum VS Code version: 1.96.0
