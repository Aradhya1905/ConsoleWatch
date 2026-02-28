import * as vscode from 'vscode';
import { ConsoleWatchServer } from './server/WebSocketServer';
import { ConsoleWatchPanel } from './ConsoleWatchPanel';
import { ConsoleWatchClientsTreeDataProvider } from './ConsoleWatchClientsTreeDataProvider';
import type { ConsoleWatchMessage, ExtensionToWebviewMessage, WebviewToExtensionMessage } from '../shared/types';

let server: ConsoleWatchServer | null = null;
let serverStartPromise: Promise<void> | null = null;
let panelWithHandlers: ConsoleWatchPanel | null = null;
let clientsProvider: ConsoleWatchClientsTreeDataProvider | null = null;
const clientActivity = new Map<string, { lastSeenAt: number; counts: Record<string, number> }>();
let clientListRefreshTimer: NodeJS.Timeout | null = null;

type WebviewTarget = {
  postMessage: (message: ExtensionToWebviewMessage) => void;
  onMessage: (handler: (message: WebviewToExtensionMessage) => void) => void;
};

function postToUIs(message: ExtensionToWebviewMessage): void {
  if (ConsoleWatchPanel.currentPanel) {
    ConsoleWatchPanel.currentPanel.postMessage(message);
  }
}

function getServerStatus(): { running: boolean; port: number } {
  return { running: server?.isRunning ?? false, port: server?.port ?? getConfig().port };
}

function getConnectionStatus(): { connected: boolean; clientCount: number } {
  const clientCount = server?.clientCount ?? 0;
  return { connected: clientCount > 0, clientCount };
}

function getConfig() {
  const config = vscode.workspace.getConfiguration('consolewatch');
  return {
    port: config.get<number>('port', 9090),
    host: config.get<string>('host', 'localhost'),
    maxConnections: config.get<number>('maxConnections', 10),
    maxEvents: config.get<number>('maxEvents', 1000),
    autoStart: config.get<boolean>('autoStart', true),
  };
}

function ensureServerInitialized(): ConsoleWatchServer {
  if (server) return server;

  const cfg = getConfig();
  server = new ConsoleWatchServer({ port: cfg.port, host: cfg.host, maxConnections: cfg.maxConnections });

  server.on('message', (message: ConsoleWatchMessage & { clientId: string }) => {
    const stats = clientActivity.get(message.clientId) ?? { lastSeenAt: Date.now(), counts: {} };
    stats.lastSeenAt = Date.now();
    stats.counts[message.type] = (stats.counts[message.type] ?? 0) + 1;
    clientActivity.set(message.clientId, stats);
    scheduleClientListRefresh();
    postToUIs({ type: 'event', payload: message });
  });

  server.on('client:connected', ({ clientId }) => {
    clientActivity.set(clientId, { lastSeenAt: Date.now(), counts: {} });
    clientsProvider?.refresh();
    postToUIs({
      type: 'connection-status',
      payload: { connected: true, clientCount: server?.clientCount ?? 0 },
    });
    vscode.window.setStatusBarMessage('ConsoleWatch: Client connected', 3000);
  });

  server.on('client:disconnected', ({ clientId }) => {
    clientActivity.delete(clientId);
    clientsProvider?.refresh();
    postToUIs({
      type: 'connection-status',
      payload: { connected: (server?.clientCount ?? 0) > 0, clientCount: server?.clientCount ?? 0 },
    });
  });

  server.on('error', ({ error }) => {
    console.error('ConsoleWatch server error:', error);
  });

  return server;
}

function scheduleClientListRefresh(): void {
  if (clientListRefreshTimer) return;
  clientListRefreshTimer = setTimeout(() => {
    clientListRefreshTimer = null;
    clientsProvider?.refresh();
  }, 750);
}

async function startServer(): Promise<void> {
  const srv = ensureServerInitialized();

  if (serverStartPromise) {
    await serverStartPromise;
    return;
  }

  if (srv.isRunning) {
    postToUIs({ type: 'server-status', payload: { running: true, port: srv.port } });
    postToUIs({ type: 'connection-status', payload: getConnectionStatus() });
    clientsProvider?.refresh();
    return;
  }

  serverStartPromise = srv
    .start()
    .then(() => {
      postToUIs({ type: 'server-status', payload: { running: true, port: srv.port } });
      postToUIs({ type: 'connection-status', payload: getConnectionStatus() });
      clientsProvider?.refresh();
    })
    .catch((err: any) => {
      console.error('Failed to start ConsoleWatch server:', err);
      vscode.window.showErrorMessage(`ConsoleWatch: Failed to start server - ${err?.message ?? String(err)}`);
      throw err;
    })
    .finally(() => {
      serverStartPromise = null;
    });

  await serverStartPromise;
}

function stopServer(): void {
  if (!server) return;
  server.stop();
  clientActivity.clear();
  postToUIs({ type: 'server-status', payload: { running: false, port: server.port } });
  postToUIs({ type: 'connection-status', payload: { connected: false, clientCount: 0 } });
  clientsProvider?.refresh();
}

export function activate(context: vscode.ExtensionContext) {
  console.log('ConsoleWatch extension activating...');

  clientsProvider = new ConsoleWatchClientsTreeDataProvider(
    () => ({ running: server?.isRunning ?? false, port: server?.port ?? getConfig().port }),
    () => {
      const clients = server?.getClientInfo() ?? [];
      return clients.map((client) => {
        const stats = clientActivity.get(client.id);
        return {
          ...client,
          lastSeenAt: stats?.lastSeenAt,
          counts: stats?.counts,
        };
      });
    }
  );

  const treeView = vscode.window.createTreeView('consolewatch.view', {
    treeDataProvider: clientsProvider,
    showCollapseAll: true,
  });
  context.subscriptions.push(treeView);

  // Register open panel command
  const openPanelAndStart = async () => {
    const panel = ConsoleWatchPanel.createOrShow(context.extensionUri);
    if (panelWithHandlers !== panel) {
      panelWithHandlers = panel;
      setupWebviewMessageHandlers(panel);
    }
    await startServer();
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('consolewatch.openPanel', openPanelAndStart)
  );

  // Open panel when Activity Bar view is shown
  context.subscriptions.push(
    treeView.onDidChangeVisibility((e) => {
      if (e.visible) {
        void openPanelAndStart();
      }
    })
  );
  if (treeView.visible) {
    void openPanelAndStart();
  }

  // Register clear command
  context.subscriptions.push(
    vscode.commands.registerCommand('consolewatch.clear', () => {
      postToUIs({ type: 'clear' });
    })
  );

  // Register toggle server command
  context.subscriptions.push(
    vscode.commands.registerCommand('consolewatch.toggleServer', async () => {
      if (server?.isRunning) {
        stopServer();
        vscode.window.showInformationMessage('ConsoleWatch server stopped');
        return;
      }

      await startServer();
      vscode.window.showInformationMessage(`ConsoleWatch server started on port ${server?.port ?? getConfig().port}`);
    })
  );

  // Register open settings command
  context.subscriptions.push(
    vscode.commands.registerCommand('consolewatch.openSettings', () => {
      vscode.commands.executeCommand('workbench.action.openSettings', 'consolewatch');
    })
  );

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('consolewatch')) {
        clientsProvider?.refresh();

        // Send updated maxEvents to webview
        const cfg = getConfig();
        postToUIs({ type: 'config', payload: { maxEvents: cfg.maxEvents } });

        // Notify about server-affecting changes
        if (e.affectsConfiguration('consolewatch.port') || e.affectsConfiguration('consolewatch.host') || e.affectsConfiguration('consolewatch.maxConnections')) {
          vscode.window.showInformationMessage('ConsoleWatch: Server settings changed. Restart the server for changes to take effect.');
        }
      }
    })
  );

  console.log('ConsoleWatch extension activated');
}

function setupWebviewMessageHandlers(target: WebviewTarget) {
  target.onMessage((message) => {
    switch (message.type) {
      case 'ready':
        void startServer().catch(() => {
          // Error UI handled in startServer
        });
        // Webview is ready, send current status and config
        target.postMessage({ type: 'server-status', payload: getServerStatus() });
        target.postMessage({ type: 'connection-status', payload: getConnectionStatus() });
        target.postMessage({ type: 'config', payload: { maxEvents: getConfig().maxEvents } });
        break;

      case 'copy':
        if (message.payload) {
          vscode.env.clipboard.writeText(String(message.payload));
          vscode.window.setStatusBarMessage('Copied to clipboard', 2000);
        }
        break;

      case 'open-file':
        const { file, line, column } = message.payload as { file: string; line?: number; column?: number };
        const uri = vscode.Uri.file(file);
        const position = new vscode.Position((line ?? 1) - 1, (column ?? 1) - 1);
        vscode.window.showTextDocument(uri, {
          selection: new vscode.Range(position, position),
        });
        break;
    }
  });
}

export function deactivate() {
  stopServer();
  server = null;
  console.log('ConsoleWatch extension deactivated');
}
