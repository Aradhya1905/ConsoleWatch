import React, { useCallback, useMemo } from 'react';
import { useEventStore } from '../../store/eventStore';
import { ConsoleEvent } from './ConsoleEvent';
import { NetworkEvent } from './NetworkEvent';
import { StateEvent } from './StateEvent';
import { TabType } from '../layout/TabBar';
import { Inbox, WifiOff, Database } from 'lucide-react';
import type { ConsoleMessage, NetworkMessage, StateMessage } from '../../../shared/types';
import { computeStateDiff } from '../details/StateDetail';

interface EventListProps {
  activeTab: TabType;
  searchQuery?: string;
  filterLevel?: string;
}

export function EventList({ activeTab, searchQuery = '', filterLevel = 'all' }: EventListProps) {
  const events = useEventStore((state) => state.events);
  const selectedEventId = useEventStore((state) => state.selectedEventId);
  const selectEvent = useEventStore((state) => state.selectEvent);
  const isConnected = useEventStore((state) => state.isConnected);
  const showAllStates = useEventStore((state) => state.showAllStates);

  const handleSelect = useCallback(
    (id: string) => {
      selectEvent(selectedEventId === id ? null : id);
    },
    [selectedEventId, selectEvent]
  );

  // Filter events based on active tab, search query, and filter level
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Filter by tab
    if (activeTab !== 'all') {
      filtered = filtered.filter((event) => event.type === activeTab);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((event) => {
        if (event.type === 'console') {
          const consoleEvent = event as ConsoleMessage;
          return consoleEvent.payload.args.some((arg) =>
            JSON.stringify(arg).toLowerCase().includes(query)
          );
        }
        if (event.type === 'network') {
          const networkEvent = event as NetworkMessage;
          return networkEvent.payload.url.toLowerCase().includes(query);
        }
        if (event.type === 'state') {
          const stateEvent = event as StateMessage;
          const searchableText = [
            stateEvent.payload.storeName,
            stateEvent.payload.actionType,
            JSON.stringify(stateEvent.payload.action),
          ].filter(Boolean).join(' ').toLowerCase();
          return searchableText.includes(query);
        }
        return false;
      });
    }

    // Filter by level
    if (filterLevel !== 'all') {
      filtered = filtered.filter((event) => {
        if (event.type === 'console') {
          const consoleEvent = event as ConsoleMessage;
          if (filterLevel === 'error') {
            return consoleEvent.payload.method === 'error';
          }
          if (filterLevel === 'warn') {
            return ['error', 'warn'].includes(consoleEvent.payload.method);
          }
          if (filterLevel === 'hide-debug') {
            return consoleEvent.payload.method !== 'debug';
          }
        }
        return true;
      });
    }

    // Filter out state events with no changes (zero diff) unless showAllStates is enabled
    if (!showAllStates) {
      filtered = filtered.filter((event) => {
        if (event.type === 'state') {
          const stateEvent = event as StateMessage;
          const diffs = computeStateDiff(stateEvent.payload.prevState, stateEvent.payload.nextState);
          return diffs.length > 0;
        }
        return true;
      });
    }

    return filtered;
  }, [events, activeTab, searchQuery, filterLevel, showAllStates]);

  // Check if we should show the network column
  const showNetworkColumn = activeTab === 'all' || activeTab === 'network';

  if (filteredEvents.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center empty-state">
        <div className="text-center max-w-md px-8">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            {isConnected ? (
              activeTab === 'state' ? (
                <div className="w-16 h-16 rounded-2xl bg-accent-purple/10 flex items-center justify-center">
                  <Database size={32} className="text-accent-purple" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-accent-blue/10 flex items-center justify-center">
                  <Inbox size={32} className="text-accent-blue" />
                </div>
              )
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-accent-amber/10 flex items-center justify-center">
                <WifiOff size={32} className="text-accent-amber" />
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {isConnected
              ? activeTab === 'all'
                ? 'No events yet'
                : activeTab === 'console'
                  ? 'No console logs yet'
                  : activeTab === 'network'
                    ? 'No network requests yet'
                    : 'No state changes yet'
              : 'Waiting for connection'}
          </h3>

          {/* Description */}
          <p className="text-sm text-text-secondary leading-relaxed">
            {isConnected ? (
              activeTab === 'network' ? (
                <>
                  Network requests from your app will appear here.
                  <br />
                  Make a fetch or XHR request to get started.
                </>
              ) : activeTab === 'console' ? (
                <>
                  Console logs from your app will appear here.
                  <br />
                  Use <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-xs font-mono">console.log()</code> to send logs.
                </>
              ) : activeTab === 'state' ? (
                <>
                  State changes from Redux/Zustand will appear here.
                  <br />
                  Use <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-xs font-mono">consolewatch.trackRedux()</code> or <code className="px-1.5 py-0.5 bg-bg-tertiary rounded text-xs font-mono">trackZustand()</code>
                </>
              ) : (
                <>
                  Connect your app to see console logs,
                  <br />
                  network requests, and more.
                </>
              )
            ) : (
              <>
                Add the ConsoleWatch client to your app
                <br />
                to start capturing events.
              </>
            )}
          </p>

          {/* Connection hint */}
          {!isConnected && (
            <div className="mt-6 p-4 bg-bg-secondary rounded-lg border border-border-subtle">
              <div className="text-xs text-text-muted mb-2">Add to your app:</div>
              <code className="text-xs text-accent-green font-mono">
                import 'consolewatch-client'
              </code>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-bg-secondary">
      <table className="log-table font-mono text-xs">
        <thead>
          <tr>
            <th className="w-8"></th>
            <th className="w-28">Type</th>
            <th>Message</th>
            <th className="text-right w-20">Time</th>
            {showNetworkColumn && <th className="text-right w-16">Size</th>}
            <th className="text-right w-20">Timestamp</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {filteredEvents.map((event) => {
            if (event.type === 'console') {
              return (
                <ConsoleEvent
                  key={event.id}
                  event={event as ConsoleMessage}
                  isSelected={selectedEventId === event.id}
                  onSelect={() => handleSelect(event.id)}
                  showNetworkColumn={showNetworkColumn}
                />
              );
            }

            if (event.type === 'network') {
              return (
                <NetworkEvent
                  key={event.id}
                  event={event as NetworkMessage}
                  isSelected={selectedEventId === event.id}
                  onSelect={() => handleSelect(event.id)}
                />
              );
            }

            if (event.type === 'state') {
              return (
                <StateEvent
                  key={event.id}
                  event={event as StateMessage}
                  isSelected={selectedEventId === event.id}
                  onSelect={() => handleSelect(event.id)}
                  showNetworkColumn={showNetworkColumn}
                />
              );
            }

            return null;
          })}
        </tbody>
      </table>
    </div>
  );
}
