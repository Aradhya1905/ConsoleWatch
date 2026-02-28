import WebSocket, { WebSocketServer, RawData } from 'ws';
import { EventEmitter } from 'events';
import type { ConsoleWatchMessage } from '../../shared/types';

interface ServerConfig {
  port: number;
  host: string;
  maxConnections: number;
  heartbeatInterval: number;
}

interface ClientInfo {
  socket: WebSocket;
  id: string;
  appName?: string;
  platform?: string;
  ip?: string;
  connectedAt: number;
}

export interface ServerEvents {
  started: { port: number };
  stopped: void;
  'client:connected': { clientId: string; ip?: string };
  'client:disconnected': { clientId: string };
  message: ConsoleWatchMessage & { clientId: string };
  error: { clientId?: string; error: string };
}

export class ConsoleWatchServer extends EventEmitter {
  private server: WebSocketServer | null = null;
  private clients: Map<string, ClientInfo> = new Map();
  private config: ServerConfig;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<ServerConfig> = {}) {
    super();
    this.config = {
      port: 9090,
      host: 'localhost',
      maxConnections: 10,
      heartbeatInterval: 30000,
      ...config,
    };
  }

  get isRunning(): boolean {
    return this.server !== null;
  }

  get clientCount(): number {
    return this.clients.size;
  }

  get port(): number {
    return this.config.port;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        resolve();
        return;
      }

      try {
        this.server = new WebSocketServer({
          port: this.config.port,
          host: this.config.host,
        });

        this.server.on('connection', this.handleConnection.bind(this));

        this.server.on('listening', () => {
          this.emit('started', { port: this.config.port });
          this.startHeartbeat();
          resolve();
        });

        this.server.on('error', (error: Error) => {
          this.emit('error', { error: error.message });
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleConnection(socket: WebSocket, request: any): void {
    if (this.clients.size >= this.config.maxConnections) {
      socket.close(1013, 'Max connections reached');
      return;
    }

    const clientId = this.generateClientId();
    const clientInfo: ClientInfo = {
      socket,
      id: clientId,
      connectedAt: Date.now(),
    };

    this.clients.set(clientId, clientInfo);

    const ip = request?.socket?.remoteAddress;
    clientInfo.ip = ip;
    this.emit('client:connected', { clientId, ip });

    socket.on('message', (data: RawData) => {
      try {
        const message = JSON.parse(data.toString()) as ConsoleWatchMessage;

        // Update client info from connection message
        if (message.type === 'connection' && message.payload) {
          const payload = message.payload as { appName?: string; platform?: string };
          clientInfo.appName = payload.appName;
          clientInfo.platform = payload.platform;
        }

        this.emit('message', { ...message, clientId });
      } catch (e) {
        this.emit('error', { clientId, error: 'Invalid JSON message' });
      }
    });

    socket.on('close', () => {
      this.clients.delete(clientId);
      this.emit('client:disconnected', { clientId });
    });

    socket.on('error', (error: Error) => {
      this.emit('error', { clientId, error: error.message });
    });

    // Handle pong for heartbeat
    socket.on('pong', () => {
      (socket as any).isAlive = true;
    });

    (socket as any).isAlive = true;
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      this.clients.forEach((client, id) => {
        if ((client.socket as any).isAlive === false) {
          client.socket.terminate();
          this.clients.delete(id);
          this.emit('client:disconnected', { clientId: id });
          return;
        }

        (client.socket as any).isAlive = false;
        client.socket.ping();
      });
    }, this.config.heartbeatInterval);
  }

  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    this.clients.forEach((client) => {
      client.socket.close(1001, 'Server shutting down');
    });
    this.clients.clear();

    if (this.server) {
      this.server.close();
      this.server = null;
      this.emit('stopped');
    }
  }

  broadcast(message: object): void {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(data);
      }
    });
  }

  sendToClient(clientId: string, message: object): boolean {
    const client = this.clients.get(clientId);
    if (client && client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  getClientInfo(): Array<{ id: string; appName?: string; platform?: string; ip?: string; connectedAt: number }> {
    return Array.from(this.clients.values()).map((client) => ({
      id: client.id,
      appName: client.appName,
      platform: client.platform,
      ip: client.ip,
      connectedAt: client.connectedAt,
    }));
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
