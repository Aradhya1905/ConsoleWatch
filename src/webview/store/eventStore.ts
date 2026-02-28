import { create } from 'zustand';
import type { ConsoleWatchMessage, MessageType } from '../../shared/types';

let maxEvents = 1000;

export type JsonViewMode = 'tree' | 'code';

interface EventStore {
  // State
  events: ConsoleWatchMessage[];
  selectedEventId: string | null;
  isConnected: boolean;
  clientCount: number;
  serverRunning: boolean;
  serverPort: number;
  showAllStates: boolean;
  jsonViewMode: JsonViewMode;
  stateFontSize: number;

  // Actions
  addEvent: (event: ConsoleWatchMessage) => void;
  clearEvents: () => void;
  selectEvent: (id: string | null) => void;
  setConnectionStatus: (connected: boolean, clientCount: number) => void;
  setServerStatus: (running: boolean, port: number) => void;
  setShowAllStates: (show: boolean) => void;
  setJsonViewMode: (mode: JsonViewMode) => void;
  setStateFontSize: (size: number) => void;
  setMaxEvents: (max: number) => void;

  // Computed helpers
  getEventsByType: (type: MessageType) => ConsoleWatchMessage[];
  getEventCounts: () => Record<MessageType, number>;
}

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],
  selectedEventId: null,
  isConnected: false,
  clientCount: 0,
  serverRunning: false,
  serverPort: 9090,
  showAllStates: false,
  jsonViewMode: 'tree',
  stateFontSize: 12,

  addEvent: (event) =>
    set((state) => {
      const newEvents = [event, ...state.events].slice(0, maxEvents);
      return { events: newEvents };
    }),

  clearEvents: () =>
    set({
      events: [],
      selectedEventId: null,
    }),

  selectEvent: (id) =>
    set({
      selectedEventId: id,
    }),

  setConnectionStatus: (connected, clientCount) =>
    set({
      isConnected: connected,
      clientCount,
    }),

  setServerStatus: (running, port) =>
    set({
      serverRunning: running,
      serverPort: port,
    }),

  setShowAllStates: (show) =>
    set({ showAllStates: show }),

  setJsonViewMode: (mode) =>
    set({ jsonViewMode: mode }),

  setStateFontSize: (size) =>
    set({ stateFontSize: Math.min(Math.max(size, 10), 24) }),

  setMaxEvents: (max) => {
    maxEvents = max;
  },

  getEventsByType: (type) => {
    return get().events.filter((event) => event.type === type);
  },

  getEventCounts: () => {
    const events = get().events;
    const counts: Record<string, number> = {};

    events.forEach((event) => {
      counts[event.type] = (counts[event.type] || 0) + 1;
    });

    return counts as Record<MessageType, number>;
  },
}));
