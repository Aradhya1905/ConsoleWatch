import React, { useState, useCallback, Fragment } from 'react';
import { Copy, ChevronRight } from 'lucide-react';
import { formatBytes, formatDuration, formatUrl, getMethodClass, getStatusClass } from '../../utils/formatters';
import { vscode } from '../../utils/vscodeApi';
import { NetworkDetail } from '../details/NetworkDetail';
import type { NetworkMessage } from '../../../shared/types';

interface NetworkEventProps {
  event: NetworkMessage;
  isSelected: boolean;
  onSelect: () => void;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getTimingClass(duration: number | undefined): string {
  if (duration === undefined) return 'text-text-muted';
  if (duration < 300) return 'timing-fast';
  if (duration < 1000) return 'timing-medium';
  return 'timing-slow';
}

export function NetworkEvent({ event, isSelected, onSelect }: NetworkEventProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { url, method, status, statusText, duration, size, error } = event.payload;

  const handleClick = useCallback(() => {
    setIsExpanded((prev) => !prev);
    onSelect();
  }, [onSelect]);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const content = JSON.stringify(event.payload, null, 2);
      vscode.send({ type: 'copy', payload: content });
    },
    [event.payload]
  );

  // Determine row class based on status
  const getRowClass = () => {
    if (error || !status) return 'log-row row-error';
    if (status >= 500) return 'log-row row-error';
    if (status >= 400) return 'log-row row-warning';
    return 'log-row';
  };

  return (
    <Fragment>
      {/* Main row */}
      <tr className={`${getRowClass()} cursor-pointer`} onClick={handleClick}>
        {/* Expand button column */}
        <td className="py-2.5 px-4">
          <button className={`expand-btn ${isExpanded ? 'expanded' : ''}`}>
            <ChevronRight size={12} />
          </button>
        </td>

        {/* Type/Method column */}
        <td className="py-2.5 px-4">
          <div className="flex items-center gap-1.5">
            <span className={`method-badge ${getMethodClass(method)}`}>
              {method.toUpperCase()}
            </span>
            {status ? (
              <span className={`status-badge ${getStatusClass(status)}`}>
                {status}
              </span>
            ) : error ? (
              <span className="status-badge status-error">ERR</span>
            ) : (
              <span className="status-badge bg-bg-tertiary text-text-muted">...</span>
            )}
          </div>
        </td>

        {/* URL/Message column */}
        <td className="py-2.5 px-4">
          <div className="flex items-center gap-2">
            <span className="text-text-primary break-all" title={url}>
              {formatUrl(url)}
            </span>
            {error && !isExpanded && (
              <span className="text-red-400 text-[10px]">{error}</span>
            )}
            {status && status >= 400 && statusText && (
              <span className="text-red-400 text-[10px]">{statusText}</span>
            )}
          </div>
        </td>

        {/* Time/Duration column */}
        <td className={`py-2.5 px-4 text-right ${getTimingClass(duration)}`}>
          {duration !== undefined ? formatDuration(duration) : '—'}
        </td>

        {/* Size column */}
        <td className="py-2.5 px-4 text-right text-text-muted">
          {size !== undefined && size > 0 ? formatBytes(size) : '0 B'}
        </td>

        {/* Timestamp column */}
        <td className="py-2.5 px-4 text-right">
          <span className="timestamp">{formatTimestamp(event.timestamp)}</span>
        </td>

        {/* Copy button column */}
        <td className="py-2.5 px-4">
          <button
            className="copy-btn"
            onClick={handleCopy}
            title="Copy request details"
          >
            <Copy size={14} />
          </button>
        </td>
      </tr>

      {/* Expanded detail row */}
      {isExpanded && (
        <tr className="border-b border-border-subtle/40">
          <td colSpan={7} className="p-0">
            <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
              <NetworkDetail payload={event.payload} />
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}
