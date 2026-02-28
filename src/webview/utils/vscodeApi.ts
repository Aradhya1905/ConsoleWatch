import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../../shared/types';

interface VSCodeAPI {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VSCodeAPI;

class VSCodeBridge {
  private api: VSCodeAPI;
  private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  constructor() {
    this.api = acquireVsCodeApi();

    window.addEventListener('message', (event) => {
      const message = event.data as ExtensionToWebviewMessage;
      if (message && message.type) {
        const handlers = this.listeners.get(message.type);
        handlers?.forEach((handler) => handler((message as any).payload));
      }
    });
  }

  send<T extends WebviewToExtensionMessage>(message: T): void {
    this.api.postMessage(message);
  }

  on<K extends ExtensionToWebviewMessage['type']>(
    type: K,
    handler: (data: Extract<ExtensionToWebviewMessage, { type: K }>['payload']) => void
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler as (data: unknown) => void);

    return () => {
      this.listeners.get(type)?.delete(handler as (data: unknown) => void);
    };
  }

  getState<T>(): T | undefined {
    return this.api.getState() as T | undefined;
  }

  setState<T>(state: T): void {
    this.api.setState(state);
  }
}

// Singleton instance
export const vscode = new VSCodeBridge();
