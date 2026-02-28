import React, { useState, useEffect } from 'react';
import { Activity, Terminal, Globe, AlertCircle, Clock } from 'lucide-react';
import { useEventStore } from '../../store/eventStore';

export function StatusBar() {
  const events = useEventStore((state) => state.events);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const consoleCount = events.filter((e) => e.type === 'console').length;
  const networkCount = events.filter((e) => e.type === 'network').length;
  const errorCount = events.filter((e) => {
    if (e.type === 'console') {
      return (e as any).payload?.method === 'error';
    }
    if (e.type === 'network') {
      const status = (e as any).payload?.status;
      const error = (e as any).payload?.error;
      return error || (status && status >= 400);
    }
    return false;
  }).length;

  return (
    <footer className="flex-shrink-0 h-9 px-4 flex items-center justify-between border-t border-border-subtle bg-bg-primary text-[11px] text-text-muted">
      {/* Left side - Stats */}
      <div className="flex items-center gap-3">
        {/* Total events */}
        <div className="flex items-center gap-1.5">
          <Activity size={12} />
          <span>{events.length} events</span>
        </div>

        <span className="text-border-subtle">•</span>

        {/* Console logs */}
        <div className="flex items-center gap-1.5">
          <Terminal size={12} />
          <span>{consoleCount} logs</span>
        </div>

        <span className="text-border-subtle">•</span>

        {/* Network requests */}
        <div className="flex items-center gap-1.5">
          <Globe size={12} />
          <span>{networkCount} requests</span>
        </div>

        {/* Errors (only show if > 0) */}
        {errorCount > 0 && (
          <>
            <span className="text-border-subtle">•</span>
            <div className="flex items-center gap-1.5 text-red-400">
              <AlertCircle size={12} />
              <span>{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
            </div>
          </>
        )}
      </div>

      {/* Right side - Current time */}
      <div className="flex items-center gap-1.5">
        <Clock size={12} />
        <span className="font-mono">{formatTime(currentTime)}</span>
      </div>
    </footer>
  );
}
