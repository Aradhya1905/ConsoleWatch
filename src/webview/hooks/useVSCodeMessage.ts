import { useEffect } from 'react';
import { vscode } from '../utils/vscodeApi';
import { useEventStore } from '../store/eventStore';
import type { ConsoleWatchMessage } from '../../shared/types';

export function useVSCodeMessages() {
  const addEvent = useEventStore((state) => state.addEvent);
  const clearEvents = useEventStore((state) => state.clearEvents);
  const setConnectionStatus = useEventStore((state) => state.setConnectionStatus);
  const setServerStatus = useEventStore((state) => state.setServerStatus);
  const setMaxEvents = useEventStore((state) => state.setMaxEvents);

  useEffect(() => {
    // Listen for events from extension
    const unsubscribeEvent = vscode.on('event', (payload) => {
      addEvent(payload as ConsoleWatchMessage);
    });

    const unsubscribeConnection = vscode.on('connection-status', (payload) => {
      const { connected, clientCount } = payload as { connected: boolean; clientCount: number };
      setConnectionStatus(connected, clientCount);
    });

    const unsubscribeServer = vscode.on('server-status', (payload) => {
      const { running, port } = payload as { running: boolean; port: number };
      setServerStatus(running, port);
    });

    const unsubscribeClear = vscode.on('clear', () => {
      clearEvents();
    });

    const unsubscribeConfig = vscode.on('config', (payload) => {
      const { maxEvents } = payload as { maxEvents: number };
      setMaxEvents(maxEvents);
    });

    // Notify extension that webview is ready
    vscode.send({ type: 'ready' });

    return () => {
      unsubscribeEvent();
      unsubscribeConnection();
      unsubscribeServer();
      unsubscribeClear();
      unsubscribeConfig();
    };
  }, [addEvent, clearEvents, setConnectionStatus, setServerStatus, setMaxEvents]);
}
