import React, { useCallback } from 'react';
import { Trash2, Settings, ArrowDownToLine, Radio, Braces, List } from 'lucide-react';
import { useEventStore } from '../../store/eventStore';

export function Header() {
  const isConnected = useEventStore((state) => state.isConnected);
  const clientCount = useEventStore((state) => state.clientCount);
  const serverRunning = useEventStore((state) => state.serverRunning);
  const serverPort = useEventStore((state) => state.serverPort);
  const clearEvents = useEventStore((state) => state.clearEvents);
  const jsonViewMode = useEventStore((state) => state.jsonViewMode);
  const setJsonViewMode = useEventStore((state) => state.setJsonViewMode);

  const handleClear = useCallback(() => {
    clearEvents();
  }, [clearEvents]);

  const handleToggleJsonView = useCallback(() => {
    setJsonViewMode(jsonViewMode === 'tree' ? 'code' : 'tree');
  }, [jsonViewMode, setJsonViewMode]);

  const handleScrollToBottom = useCallback(() => {
    const mainContent = document.querySelector('main');
    if (mainContent) {
      mainContent.scrollTo({ top: mainContent.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  return (
    <header className="flex-shrink-0 h-12 px-4 flex items-center justify-between border-b border-border-subtle bg-bg-primary">
      {/* Left side - Logo and connection status */}
      <div className="flex items-center gap-4">
        {/* Connection status */}
<div className="flex items-center gap-2.5">
          <span className={`connection-dot ${!isConnected ? 'disconnected' : ''}`} />
          <span className="text-xs text-text-secondary">
            {isConnected ? (
              <>
                <span className="text-text-primary font-medium">{clientCount}</span>
                {' '}client{clientCount !== 1 ? 's' : ''} connected
              </>
            ) : (
              'Disconnected'
            )}
          </span>
        </div>
      </div>

      {/* Right side - Server URL and actions */}
      <div className="flex items-center gap-2">
        {/* Server URL badge */}
        <div className="server-url-badge">
          <Radio size={12} />
          <span>
            {serverRunning ? `ws://localhost:${serverPort}` : 'Server stopped'}
          </span>
        </div>

        {/* Divider */}
        <div className="divider mx-1" />

        {/* JSON view mode toggle */}
        <button
          onClick={handleToggleJsonView}
          className={`action-btn ${jsonViewMode === 'code' ? 'text-accent-blue' : ''}`}
          title={jsonViewMode === 'tree' ? 'Switch to Code view' : 'Switch to Tree view'}
        >
          {jsonViewMode === 'tree' ? <Braces size={16} /> : <List size={16} />}
        </button>

        {/* Action buttons */}
        <button
          onClick={handleClear}
          className="action-btn"
          title="Clear all"
        >
          <Trash2 size={16} />
        </button>
        <button
          onClick={handleScrollToBottom}
          className="action-btn"
          title="Scroll to bottom"
        >
          <ArrowDownToLine size={16} />
        </button>
        <button
          className="action-btn"
          title="Settings"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}
