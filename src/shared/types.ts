// Message types for ConsoleWatch protocol
export type MessageType =
  | 'console'
  | 'network'
  | 'state'
  | 'error'
  | 'navigation'
  | 'custom'
  | 'benchmark'
  | 'connection';

// Console log levels
export type ConsoleMethod = 'log' | 'warn' | 'error' | 'info' | 'debug';

// Base message structure
export interface ConsoleWatchMessage {
  id: string;
  type: MessageType;
  timestamp: number;
  payload: unknown;
  meta?: {
    sessionId: string;
    appName?: string;
    platform?: 'web' | 'ios' | 'android' | 'react-native';
  };
}

// Console event payload
export interface ConsolePayload {
  method: ConsoleMethod;
  args: unknown[];
}

// Network event payload
export interface NetworkPayload {
  requestId: string;
  url: string;
  method: string;
  status?: number;
  statusText?: string;
  duration?: number;
  size?: number;
  requestHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseHeaders?: Record<string, string>;
  responseBody?: unknown;
  error?: string;
}

// State event payload
export interface StatePayload {
  storeName?: string;
  actionType?: string;
  action?: unknown;
  prevState?: unknown;
  nextState?: unknown;
}

// Error event payload
export interface ErrorPayload {
  message: string;
  name?: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  componentStack?: string;
  type?: 'error' | 'unhandledrejection';
}

// Benchmark event payload
export interface BenchmarkPayload {
  name: string;
  duration: number;
  category?: string;
}

// Connection event payload
export interface ConnectionPayload {
  status: 'connected' | 'disconnected';
  appName?: string;
  platform?: string;
}

// Typed message helpers
export interface ConsoleMessage extends ConsoleWatchMessage {
  type: 'console';
  payload: ConsolePayload;
}

export interface NetworkMessage extends ConsoleWatchMessage {
  type: 'network';
  payload: NetworkPayload;
}

export interface StateMessage extends ConsoleWatchMessage {
  type: 'state';
  payload: StatePayload;
}

export interface ErrorMessage extends ConsoleWatchMessage {
  type: 'error';
  payload: ErrorPayload;
}

export interface BenchmarkMessage extends ConsoleWatchMessage {
  type: 'benchmark';
  payload: BenchmarkPayload;
}

export interface ConnectionMessage extends ConsoleWatchMessage {
  type: 'connection';
  payload: ConnectionPayload;
}

// Union of all typed messages
export type TypedConsoleWatchMessage =
  | ConsoleMessage
  | NetworkMessage
  | StateMessage
  | ErrorMessage
  | BenchmarkMessage
  | ConnectionMessage;

// Webview communication messages
export interface WebviewMessage {
  type: string;
  payload?: unknown;
}

// Extension to Webview message types
export type ExtensionToWebviewMessage =
  | { type: 'event'; payload: ConsoleWatchMessage }
  | { type: 'connection-status'; payload: { connected: boolean; clientCount: number } }
  | { type: 'clear' }
  | { type: 'server-status'; payload: { running: boolean; port: number } }
  | { type: 'config'; payload: { maxEvents: number } };

// Webview to Extension message types
export type WebviewToExtensionMessage =
  | { type: 'ready' }
  | { type: 'clear' }
  | { type: 'copy'; payload: string }
  | { type: 'open-file'; payload: { file: string; line?: number; column?: number } };
