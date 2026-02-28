import * as vscode from 'vscode';

export type ClientListItem = {
  id: string;
  appName?: string;
  platform?: string;
  ip?: string;
  connectedAt: number;
  lastSeenAt?: number;
  counts?: Record<string, number>;
};

type ServerSummary = {
  running: boolean;
  port: number;
};

type Node =
  | { kind: 'server' }
  | { kind: 'serverInfo'; label: string; description?: string; icon: string; color?: string }
  | { kind: 'serverAction'; label: string; command: vscode.Command; icon: string }
  | { kind: 'clients' }
  | { kind: 'client'; client: ClientListItem }
  | { kind: 'empty'; label: string; description?: string }
  | { kind: 'settings' }
  | { kind: 'setting'; label: string; value: string; icon: string };

export class ConsoleWatchClientsTreeDataProvider implements vscode.TreeDataProvider<Node> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private readonly _getServer: () => ServerSummary,
    private readonly _getClients: () => ClientListItem[]
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Node): vscode.TreeItem {
    switch (element.kind) {
      case 'server': {
        const srv = this._getServer();
        const item = new vscode.TreeItem('Server', vscode.TreeItemCollapsibleState.Expanded);
        item.description = srv.running ? `Running · ${srv.port}` : 'Stopped';
        item.tooltip = srv.running ? `Running on port ${srv.port}` : 'Stopped';
        item.iconPath = new vscode.ThemeIcon(
          'server',
          new vscode.ThemeColor(srv.running ? 'charts.green' : 'charts.red')
        );
        return item;
      }

      case 'clients': {
        const clients = this._getClients();
        const item = new vscode.TreeItem(`Clients (${clients.length})`, vscode.TreeItemCollapsibleState.Expanded);
        item.tooltip = clients.length ? `${clients.length} client(s) connected` : 'No clients connected';
        item.iconPath = new vscode.ThemeIcon('device-desktop');
        return item;
      }

      case 'settings': {
        const item = new vscode.TreeItem('Settings', vscode.TreeItemCollapsibleState.Collapsed);
        item.tooltip = 'ConsoleWatch configuration';
        item.iconPath = new vscode.ThemeIcon('gear');
        return item;
      }

      case 'serverInfo': {
        const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
        if (element.description) item.description = element.description;
        item.iconPath = new vscode.ThemeIcon(
          element.icon,
          element.color ? new vscode.ThemeColor(element.color) : undefined
        );
        return item;
      }

      case 'serverAction': {
        const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
        item.command = element.command;
        item.iconPath = new vscode.ThemeIcon(element.icon);
        return item;
      }

      case 'setting': {
        const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
        item.description = element.value;
        item.iconPath = new vscode.ThemeIcon(element.icon);
        item.command = {
          command: 'consolewatch.openSettings',
          title: 'Open Settings',
        };
        item.tooltip = `Click to change · Current: ${element.value}`;
        return item;
      }

      case 'client': {
        const c = element.client;
        const label = c.appName || c.id;
        const item = new vscode.TreeItem(label, vscode.TreeItemCollapsibleState.None);

        const descriptionParts: string[] = [];
        if (c.platform) descriptionParts.push(c.platform);
        if (c.ip) descriptionParts.push(c.ip);
        item.description = descriptionParts.join(' · ');

        // Platform-specific icon
        const platform = c.platform?.toLowerCase() ?? '';
        let iconId = 'zap';
        if (platform.includes('react-native') || platform.includes('mobile') || platform.includes('ios') || platform.includes('android')) {
          iconId = 'device-mobile';
        } else if (platform.includes('web') || platform.includes('browser')) {
          iconId = 'globe';
        } else if (platform.includes('node') || platform.includes('server')) {
          iconId = 'terminal';
        } else if (platform.includes('flutter')) {
          iconId = 'device-mobile';
        }
        item.iconPath = new vscode.ThemeIcon(iconId);

        const counts = c.counts;
        const countText = counts
          ? Object.entries(counts)
              .filter(([, v]) => v > 0)
              .map(([k, v]) => `${k}:${v}`)
              .join('  ')
          : '';

        const tooltipLines = [
          `id: ${c.id}`,
          c.platform ? `platform: ${c.platform}` : undefined,
          c.ip ? `ip: ${c.ip}` : undefined,
          `connected: ${new Date(c.connectedAt).toLocaleString()}`,
          c.lastSeenAt ? `last seen: ${new Date(c.lastSeenAt).toLocaleString()}` : undefined,
          countText ? `counts: ${countText}` : undefined,
        ].filter(Boolean) as string[];

        item.tooltip = tooltipLines.join('\n');
        item.command = {
          command: 'consolewatch.openPanel',
          title: 'Open Panel',
        };

        return item;
      }

      case 'empty': {
        const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
        if (element.description) item.description = element.description;
        item.iconPath = new vscode.ThemeIcon('info');
        return item;
      }
    }
  }

  getChildren(element?: Node): Thenable<Node[]> {
    const srv = this._getServer();

    if (!element) {
      return Promise.resolve([{ kind: 'server' }, { kind: 'clients' }, { kind: 'settings' }]);
    }

    if (element.kind === 'server') {
      const actions: Node[] = [
        {
          kind: 'serverInfo',
          label: 'Status',
          description: srv.running ? 'Running' : 'Stopped',
          icon: 'circle-filled',
          color: srv.running ? 'charts.green' : 'charts.red',
        },
        {
          kind: 'serverInfo',
          label: 'Port',
          description: String(srv.port),
          icon: 'plug',
        },
        {
          kind: 'serverAction',
          label: 'Open Panel',
          command: { command: 'consolewatch.openPanel', title: 'Open Panel' },
          icon: 'window',
        },
        {
          kind: 'serverAction',
          label: srv.running ? 'Stop Server' : 'Start Server',
          command: { command: 'consolewatch.toggleServer', title: 'Toggle Server' },
          icon: srv.running ? 'debug-stop' : 'debug-start',
        },
      ];
      return Promise.resolve(actions);
    }

    if (element.kind === 'clients') {
      const clients = this._getClients();
      if (!clients.length) {
        return Promise.resolve([
          {
            kind: 'empty',
            label: 'No clients connected',
            description: srv.running ? 'Waiting for connections…' : 'Start the server to accept connections',
          },
        ]);
      }

      return Promise.resolve(
        clients
          .slice()
          .sort((a, b) => (a.appName || a.id).localeCompare(b.appName || b.id))
          .map((client) => ({ kind: 'client' as const, client }))
      );
    }

    if (element.kind === 'settings') {
      const config = vscode.workspace.getConfiguration('consolewatch');
      const settings: Node[] = [
        { kind: 'setting', label: 'Port', value: String(config.get('port', 9090)), icon: 'plug' },
        { kind: 'setting', label: 'Host', value: String(config.get('host', 'localhost')), icon: 'globe' },
        { kind: 'setting', label: 'Max Connections', value: String(config.get('maxConnections', 10)), icon: 'people' },
        { kind: 'setting', label: 'Max Events', value: String(config.get('maxEvents', 1000)), icon: 'list-unordered' },
        { kind: 'setting', label: 'Auto Start', value: config.get('autoStart', true) ? 'On' : 'Off', icon: 'play-circle' },
      ];
      return Promise.resolve(settings);
    }

    return Promise.resolve([]);
  }
}
