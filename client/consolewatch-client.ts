/**
 * ConsoleWatch Client SDK
 *
 * Copy this file into your React/React Native application's entry point.
 * Works with React, React Native, and vanilla JavaScript.
 *
 * Usage:
 *   import './consolewatch-client';
 *
 * Or for custom configuration:
 *   import { createConsoleWatch } from './consolewatch-client';
 *   createConsoleWatch({ url: 'ws://localhost:9090', appName: 'MyApp' });
 */

interface ConsoleWatchConfig {
  url?: string;
  appName?: string;
  enabled?: boolean;
  captureConsole?: boolean;
  captureNetwork?: boolean;
  captureErrors?: boolean;
}

interface ConsoleWatchClient {
  log: (type: string, payload: unknown) => void;
  benchmark: (name: string) => () => void;
  disconnect: () => void;
  trackRedux: (store: any) => (next: any) => (action: any) => any;
  trackZustand: <T>(store: { getState: () => T; subscribe: (listener: (state: T) => void) => () => void }, name?: string) => () => void;
  trackStores: (stores: Record<string, { getState: () => any; subscribe: (listener: (state: any) => void) => () => void }>) => () => void;
}

declare const __DEV__: boolean | undefined;

export function createConsoleWatch(config: ConsoleWatchConfig = {}): ConsoleWatchClient {
  const g = globalThis as any;
  const consoleRef = g.console;
  const devFlag = typeof __DEV__ !== 'undefined' ? __DEV__ : undefined;
  const nodeEnv = g.process?.env?.NODE_ENV;

  const {
    url = 'ws://localhost:9090',
    appName = 'MyApp',
    enabled = devFlag !== undefined ? devFlag : nodeEnv === 'development',
    captureConsole = true,
    captureNetwork = true,
    captureErrors = true,
  } = config;

  // Return no-op client if disabled
  if (!enabled) {
    return {
      log: () => { },
      benchmark: () => () => { },
      disconnect: () => { },
      trackRedux: () => (next: any) => (action: any) => next(action),
      trackZustand: () => () => { },
      trackStores: () => () => { },
    };
  }

  // Connection state
  let ws: any = null;
  let queue: object[] = [];
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const WS_OPEN = 1;

  const now = (): number => {
    const perf = g.performance;
    if (perf && typeof perf.now === 'function') return perf.now();
    return Date.now();
  };

  // Platform detection
  const platform = (() => {
    const nav = g.navigator;
    if (nav?.product === 'ReactNative') return 'react-native';
    if (typeof g.document !== 'undefined') return 'web';
    return 'node';
  })();

  // Generate unique ID
  const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  };

  // Safe stringify (handles circular refs and special objects)
  const safeStringify = (obj: unknown): unknown => {
    const seen = new WeakSet();

    const recurse = (value: unknown, depth: number): unknown => {
      if (value === null) return null;
      if (value === undefined) return undefined;
      if (typeof value !== 'object') return value;

      if (seen.has(value as object)) return '[Circular]';
      seen.add(value as object);

      if (Array.isArray(value)) {
        return value.map((v) => recurse(v, depth + 1));
      }

      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
      }

      if (value instanceof Date) {
        return value.toISOString();
      }

      if (value instanceof RegExp) {
        return value.toString();
      }

      // Handle DOM elements
      const ElementCtor = g.Element;
      if (typeof ElementCtor === 'function' && value instanceof ElementCtor) {
        return `[${(value as any).tagName || 'Element'}]`;
      }

      // Handle functions
      if (typeof value === 'function') {
        return `[Function: ${value.name || 'anonymous'}]`;
      }

      const result: Record<string, unknown> = {};
      for (const key of Object.keys(value as object)) {
        try {
          result[key] = recurse((value as Record<string, unknown>)[key], depth + 1);
        } catch {
          result[key] = '[Unable to serialize]';
        }
      }
      return result;
    };

    return recurse(obj, 0);
  };

  // Send message to server
  const send = (message: object): void => {
    const fullMessage = {
      id: generateId(),
      timestamp: Date.now(),
      meta: { sessionId, appName, platform },
      ...message,
    };

    if (ws?.readyState === WS_OPEN && typeof ws?.send === 'function') {
      ws.send(JSON.stringify(fullMessage));
    } else {
      queue.push(fullMessage);
      if (queue.length > 100) queue.shift();
    }
  };

  // Connect to server
  const connect = (): void => {
    try {
      const WebSocketCtor = g.WebSocket;
      if (typeof WebSocketCtor !== 'function') {
        consoleRef?.debug?.('[ConsoleWatch] WebSocket is not available in this environment.');
        return;
      }

      ws = new WebSocketCtor(url);

      ws.onopen = () => {
        reconnectAttempts = 0;
        send({
          type: 'connection',
          payload: { status: 'connected', appName, platform },
        });

        // Flush queued messages
        queue.forEach((msg) => ws?.send(JSON.stringify(msg)));
        queue = [];
      };

      ws.onclose = () => {
        ws = null;
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = Math.min(1000 * reconnectAttempts, 5000);
          const setTimeoutFn = g.setTimeout;
          if (typeof setTimeoutFn === 'function') setTimeoutFn(connect, delay);
        }
      };

      ws.onerror = () => {
        ws?.close();
      };
    } catch (e) {
      // WebSocket not available or connection failed
      consoleRef?.debug?.('[ConsoleWatch] Connection failed:', e);
    }
  };

  // Patch console methods
  if (captureConsole && consoleRef) {
    const methods = ['log', 'warn', 'error', 'info', 'debug'] as const;

    methods.forEach((method) => {
      const original = consoleRef[method];
      if (typeof original !== 'function') return;

      consoleRef[method] = (...args: unknown[]) => {
        // Send to ConsoleWatch
        send({
          type: 'console',
          payload: {
            method,
            args: args.map((arg) => safeStringify(arg)),
          },
        });

        // Call original
        original.apply(consoleRef, args);
      };
    });
  }

  // Track in-flight fetch requests to avoid duplicate capture from XHR polyfills
  const activeFetchRequests = new Set<string>();

  // Patch fetch
  if (captureNetwork && typeof g.fetch === 'function') {
    const originalFetch = g.fetch;

    g.fetch = async (input: any, init?: any): Promise<any> => {
      const URLCtor = g.URL;
      const url = typeof input === 'string'
        ? input
        : (typeof URLCtor === 'function' && input instanceof URLCtor)
          ? input.href
          : input?.url || String(input);

      const method = init?.method || 'GET';
      const requestId = generateId();
      const startTime = now();
      const fetchKey = `${method}:${url}`;
      activeFetchRequests.add(fetchKey);

      // Capture request headers
      const requestHeaders: Record<string, string> = {};
      const recordHeader = (key: string, value: unknown): void => {
        const lower = key.toLowerCase();
        const stringValue = lower === 'authorization'
          ? '[REDACTED]'
          : typeof value === 'string'
            ? value
            : Array.isArray(value)
              ? value.join(', ')
              : value == null
                ? ''
                : String(value);
        requestHeaders[key] = stringValue;
      };
      const headersInit = init?.headers;
      if (headersInit) {
        try {
          if (typeof (headersInit as any).forEach === 'function') {
            (headersInit as any).forEach((value: string, key: string) => {
              recordHeader(key, value);
            });
          } else if (Array.isArray(headersInit)) {
            (headersInit as Array<[string, unknown]>).forEach(([key, value]) => {
              if (typeof key === 'string') recordHeader(key, value);
            });
          } else if (typeof headersInit === 'object') {
            Object.entries(headersInit as Record<string, unknown>).forEach(([key, value]) => {
              recordHeader(key, value);
            });
          }
        } catch {
          // Ignore header capture errors
        }
      }

      // Capture request body
      let requestBody: unknown = null;
      if (init?.body) {
        try {
          if (typeof init.body === 'string') {
            requestBody = JSON.parse(init.body);
          } else {
            requestBody = '[Binary/FormData]';
          }
        } catch {
          requestBody = init.body;
        }
      }

      try {
        const response = await originalFetch(input, init);
        const duration = Math.round(now() - startTime);

        // Clone response to read body
        const clone = response.clone();
        let responseBody: unknown = null;
        let responseSize = 0;

        try {
          const text = await clone.text();
          responseSize = text.length;
          responseBody = text ? JSON.parse(text) : null;
        } catch {
          responseBody = '[Unable to parse]';
        }

        // Capture response headers
        const responseHeaders: Record<string, string> = {};
        try {
          const respHeaders = (response as any).headers;
          if (respHeaders && typeof respHeaders.forEach === 'function') {
            respHeaders.forEach((value: string, key: string) => {
              responseHeaders[key] = value;
            });
          }
        } catch {
          // Ignore header capture errors
        }

        send({
          type: 'network',
          payload: {
            requestId,
            url,
            method,
            status: response.status,
            statusText: response.statusText,
            duration,
            size: responseSize,
            requestHeaders,
            requestBody: safeStringify(requestBody),
            responseHeaders,
            responseBody: safeStringify(responseBody),
          },
        });

        activeFetchRequests.delete(fetchKey);
        return response;
      } catch (error) {
        const duration = Math.round(now() - startTime);

        send({
          type: 'network',
          payload: {
            requestId,
            url,
            method,
            status: 0,
            statusText: 'Network Error',
            duration,
            error: error instanceof Error ? error.message : 'Unknown error',
            requestHeaders,
            requestBody: safeStringify(requestBody),
          },
        });

        activeFetchRequests.delete(fetchKey);
        throw error;
      }
    };
  }

  // Patch XMLHttpRequest
  if (captureNetwork && typeof g.XMLHttpRequest !== 'undefined') {
    const XHR = g.XMLHttpRequest.prototype;
    const originalOpen = XHR.open;
    const originalSend = XHR.send;
    const originalSetRequestHeader = XHR.setRequestHeader;

    XHR.open = function (
      method: string,
      url: string | { toString(): string },
      async: boolean = true,
      username?: string | null,
      password?: string | null
    ) {
      (this as any)._consolewatch = {
        method,
        url: url.toString(),
        requestHeaders: {} as Record<string, string>,
        startTime: 0,
        requestId: generateId(),
      };
      return originalOpen.apply(this, [method, url, async, username, password] as any);
    };

    XHR.setRequestHeader = function (name: string, value: string) {
      const meta = (this as any)._consolewatch;
      if (meta) {
        // Redact sensitive headers
        meta.requestHeaders[name] = name.toLowerCase() === 'authorization'
          ? '[REDACTED]'
          : value;
      }
      return originalSetRequestHeader.apply(this, [name, value] as any);
    };

    XHR.send = function (body?: unknown) {
      const meta = (this as any)._consolewatch;

      if (meta) {
        meta.startTime = now();

        // Capture request body
        if (body) {
          try {
            if (typeof body === 'string') {
              meta.requestBody = JSON.parse(body);
            } else {
              meta.requestBody = '[Binary/FormData]';
            }
          } catch {
            meta.requestBody = body;
          }
        }

        // Listen for load event
        this.addEventListener('load', () => {
          // Skip if this request was already captured by the fetch interceptor
          const xhrKey = `${meta.method}:${meta.url}`;
          if (activeFetchRequests.has(xhrKey)) return;

          const duration = Math.round(now() - meta.startTime);

          // Parse response body
          let responseBody: unknown = null;
          try {
            if (this.responseType === '' || this.responseType === 'text') {
              responseBody = this.responseText ? JSON.parse(this.responseText) : null;
            } else if (this.responseType === 'json') {
              responseBody = this.response;
            } else {
              responseBody = '[Binary Response]';
            }
          } catch {
            try {
              responseBody = (this.responseType === '' || this.responseType === 'text')
                ? (this.responseText || '[Unable to parse]')
                : '[Unable to parse]';
            } catch {
              responseBody = '[Unable to parse]';
            }
          }

          // Get response headers
          const responseHeaders: Record<string, string> = {};
          const headerString = this.getAllResponseHeaders();
          if (headerString) {
            headerString.split('\r\n').forEach((line: string) => {
              const parts = line.split(': ');
              if (parts.length === 2) {
                responseHeaders[parts[0]] = parts[1];
              }
            });
          }

          send({
            type: 'network',
            payload: {
              requestId: meta.requestId,
              url: meta.url,
              method: meta.method,
              status: this.status,
              statusText: this.statusText,
              duration,
              size: (this.responseType === '' || this.responseType === 'text') ? (this.responseText?.length || 0) : 0,
              requestHeaders: meta.requestHeaders,
              requestBody: safeStringify(meta.requestBody),
              responseHeaders,
              responseBody: safeStringify(responseBody),
            },
          });
        });

        // Listen for error event
        this.addEventListener('error', () => {
          const xhrKey = `${meta.method}:${meta.url}`;
          if (activeFetchRequests.has(xhrKey)) return;

          const duration = Math.round(now() - meta.startTime);

          send({
            type: 'network',
            payload: {
              requestId: meta.requestId,
              url: meta.url,
              method: meta.method,
              status: 0,
              statusText: 'XHR Error',
              duration,
              error: 'XMLHttpRequest failed',
              requestHeaders: meta.requestHeaders,
              requestBody: safeStringify(meta.requestBody),
            },
          });
        });

        // Listen for timeout
        this.addEventListener('timeout', () => {
          const xhrKey = `${meta.method}:${meta.url}`;
          if (activeFetchRequests.has(xhrKey)) return;

          const duration = Math.round(now() - meta.startTime);

          send({
            type: 'network',
            payload: {
              requestId: meta.requestId,
              url: meta.url,
              method: meta.method,
              status: 0,
              statusText: 'Timeout',
              duration,
              error: 'Request timed out',
              requestHeaders: meta.requestHeaders,
              requestBody: safeStringify(meta.requestBody),
            },
          });
        });
      }

      return originalSend.apply(this, [body] as any);
    };
  }

  // Capture errors
  if (captureErrors) {
    if (typeof g.addEventListener === 'function') {
      g.addEventListener('error', (event: any) => {
        send({
          type: 'error',
          payload: {
            message: event?.message || 'Uncaught Error',
            filename: event?.filename,
            lineno: event?.lineno,
            colno: event?.colno,
            stack: event?.error?.stack,
          },
        });
      });

      g.addEventListener('unhandledrejection', (event: any) => {
        const reason = event?.reason;
        send({
          type: 'error',
          payload: {
            message: reason?.message || (typeof reason === 'string' ? reason : 'Unhandled Promise Rejection'),
            stack: reason?.stack,
            type: 'unhandledrejection',
          },
        });
      });
    } else {
      const errorUtils = g.ErrorUtils;
      if (errorUtils && typeof errorUtils.setGlobalHandler === 'function') {
        const defaultHandler = typeof errorUtils.getGlobalHandler === 'function'
          ? errorUtils.getGlobalHandler()
          : null;

        errorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
          try {
            send({
              type: 'error',
              payload: {
                message: error?.message || 'Unhandled JS Error',
                stack: error?.stack,
                type: 'react-native-error',
                isFatal: !!isFatal,
              },
            });
          } catch {
            // Ignore logging failures
          }

          if (typeof defaultHandler === 'function') {
            defaultHandler(error, isFatal);
          }
        });
      }
    }
  }

  // Connect to server
  connect();

  // Public API
  return {
    log: (type: string, payload: unknown) => {
      send({
        type: 'custom',
        payload: { eventType: type, data: safeStringify(payload) },
      });
    },

    benchmark: (name: string) => {
      const start = now();
      return () => {
        send({
          type: 'benchmark',
          payload: { name, duration: Math.round(now() - start) },
        });
      };
    },

    disconnect: () => {
      ws?.close();
      ws = null;
    },

    // Redux middleware for state tracking
    trackRedux: (store: any) => {
      if (!store || typeof store.getState !== 'function') {
        consoleRef?.error?.('[ConsoleWatch] trackRedux requires a Redux store. Usage: applyMiddleware(consolewatch.trackRedux(store))');
        return (next: any) => (action: any) => next(action);
      }
      return (next: any) => (action: any) => {
        const prevState = store.getState();
        const result = next(action);
        const nextState = store.getState();

        send({
          type: 'state',
          payload: {
            storeName: 'Redux',
            actionType: action.type || 'unknown',
            action: safeStringify(action),
            prevState: safeStringify(prevState),
            nextState: safeStringify(nextState),
          },
        });

        return result;
      };
    },

    // Zustand store subscription for state tracking
    trackZustand: <T>(
      store: { getState: () => T; subscribe: (listener: (state: T) => void) => () => void },
      name: string = 'Zustand'
    ) => {
      if (!store || typeof store.getState !== 'function' || typeof store.subscribe !== 'function') {
        consoleRef?.error?.('[ConsoleWatch] trackZustand requires a Zustand store. Usage: consolewatch.trackZustand(useMyStore, "StoreName")');
        return () => { };
      }
      let prevState = safeStringify(store.getState());

      return store.subscribe((nextState: T) => {
        const serializedNextState = safeStringify(nextState);

        send({
          type: 'state',
          payload: {
            storeName: name,
            actionType: 'state_change',
            prevState: prevState,
            nextState: serializedNextState,
          },
        });

        prevState = serializedNextState;
      });
    },

    // Track multiple stores at once from your app entry point
    trackStores: (stores: Record<string, { getState: () => any; subscribe: (listener: (state: any) => void) => () => void }>) => {
      const unsubscribers: (() => void)[] = [];
      for (const [name, store] of Object.entries(stores)) {
        if (store && typeof store.getState === 'function' && typeof store.subscribe === 'function') {
          let prevState = safeStringify(store.getState());
          const unsub = store.subscribe((nextState: any) => {
            const serializedNextState = safeStringify(nextState);
            send({
              type: 'state',
              payload: {
                storeName: name,
                actionType: 'state_change',
                prevState: prevState,
                nextState: serializedNextState,
              },
            });
            prevState = serializedNextState;
          });
          unsubscribers.push(unsub);
        } else {
          consoleRef?.warn?.(`[ConsoleWatch] trackStores: "${name}" is not a valid store (missing getState/subscribe)`);
        }
      }
      return () => unsubscribers.forEach(fn => fn());
    },
  };
}

// Auto-initialize
const consolewatch = createConsoleWatch();

// Export for global access
(globalThis as any).consolewatch = consolewatch;

export default consolewatch;
