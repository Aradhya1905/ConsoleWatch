import React, { useState, useCallback, Fragment } from 'react';
import { Copy, ChevronRight, MessageSquare, Info, AlertTriangle, XCircle, Bug } from 'lucide-react';
import { JsonView } from '../shared/JsonTree';
import { vscode } from '../../utils/vscodeApi';
import type { ConsoleMessage, ConsoleMethod } from '../../../shared/types';

interface ConsoleEventProps {
  event: ConsoleMessage;
  isSelected: boolean;
  onSelect: () => void;
  showNetworkColumn?: boolean;
}

const methodConfig: Record<ConsoleMethod, { label: string; badgeClass: string; icon: React.ReactNode; textClass?: string }> = {
  log: {
    label: 'LOG',
    badgeClass: 'badge badge-log',
    icon: <MessageSquare size={10} />,
  },
  info: {
    label: 'INFO',
    badgeClass: 'badge badge-info',
    icon: <Info size={10} />,
  },
  warn: {
    label: 'WARN',
    badgeClass: 'badge badge-warn',
    icon: <AlertTriangle size={10} />,
    textClass: 'text-yellow-400',
  },
  error: {
    label: 'ERROR',
    badgeClass: 'badge badge-error',
    icon: <XCircle size={10} />,
    textClass: 'text-red-400',
  },
  debug: {
    label: 'DEBUG',
    badgeClass: 'badge badge-debug',
    icon: <Bug size={10} />,
  },
};

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getPreviewText(args: unknown[], maxLength: number = 80): string {
  const preview = args.map((arg) => {
    if (typeof arg === 'string') return `"${arg}"`;
    if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (Array.isArray(arg)) return `Array[${arg.length}]`;
    if (typeof arg === 'object') {
      const keys = Object.keys(arg as object);
      if (keys.length <= 3) {
        const preview = keys.map(k => `${k}: ...`).join(', ');
        return `{${preview}}`;
      }
      return `Object`;
    }
    return String(arg);
  }).join(' ');

  if (preview.length > maxLength) {
    return preview.substring(0, maxLength) + '...';
  }
  return preview;
}

function isExpandable(args: unknown[]): boolean {
  return args.some((arg) =>
    (typeof arg === 'object' && arg !== null) ||
    (typeof arg === 'string' && arg.length > 100)
  );
}

function getTypeTag(arg: unknown): string | null {
  if (Array.isArray(arg)) return `Array[${arg.length}]`;
  if (typeof arg === 'object' && arg !== null) return 'Object';
  return null;
}

export function ConsoleEvent({ event, isSelected, onSelect, showNetworkColumn = true }: ConsoleEventProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { method, args } = event.payload;
  const config = methodConfig[method];
  const expandable = isExpandable(args);

  const handleClick = useCallback(() => {
    if (expandable) {
      setIsExpanded((prev) => !prev);
    }
    onSelect();
  }, [onSelect, expandable]);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const content = args.map((arg) =>
        typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
      ).join(' ');
      vscode.send({ type: 'copy', payload: content });
    },
    [args]
  );

  const rowClasses = [
    'log-row',
    'cursor-pointer',
    method === 'error' && 'row-error',
    method === 'warn' && 'row-warning',
    method === 'debug' && 'opacity-50 hover:opacity-70',
  ].filter(Boolean).join(' ');

  // Get type tag for first complex argument
  const firstTypeTag = args.length > 0 ? getTypeTag(args[0]) : null;

  return (
    <Fragment>
      <tr className={rowClasses} onClick={handleClick}>
        {/* Expand button column */}
        <td className="py-2.5 px-4">
          {expandable && (
            <button className={`expand-btn ${isExpanded ? 'expanded' : ''}`}>
              <ChevronRight size={12} />
            </button>
          )}
        </td>

        {/* Type/Badge column */}
        <td className="py-2.5 px-4">
          <span className={config.badgeClass}>
            {config.icon}
            {config.label}
          </span>
        </td>

        {/* Message column */}
        <td className="py-2.5 px-4">
          <div className={`text-text-primary ${config.textClass || ''}`}>
            {!isExpanded && (
              <span className="log-message">
                {firstTypeTag ? (
                  <span className="expandable-value">
                    <span className="type-tag">{firstTypeTag}</span>
                    <span className="preview">{getPreviewText(args)}</span>
                  </span>
                ) : (
                  getPreviewText(args, 120)
                )}
              </span>
            )}
            {isExpanded && (
              <div className="expanded-content" onClick={(e) => e.stopPropagation()}>
                {args.map((arg, index) => (
                  <div key={index} className={index > 0 ? 'mt-2' : ''}>
                    <JsonView data={arg} initialExpanded={true} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </td>

        {/* Time column (duration - not applicable for console) */}
        <td className="py-2.5 px-4 text-right text-text-muted">
          —
        </td>

        {/* Size column (for network events, shown when in "all" tab) */}
        {showNetworkColumn && (
          <td className="py-2.5 px-4 text-right text-text-muted"></td>
        )}

        {/* Timestamp column */}
        <td className="py-2.5 px-4 text-right">
          <span className="timestamp">{formatTimestamp(event.timestamp)}</span>
        </td>

        {/* Copy button column */}
        <td className="py-2.5 px-4">
          <button
            className="copy-btn"
            onClick={handleCopy}
            title="Copy to clipboard"
          >
            <Copy size={14} />
          </button>
        </td>
      </tr>
    </Fragment>
  );
}
