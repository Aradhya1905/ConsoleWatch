import React, { useState, useCallback, Fragment } from 'react';
import { Copy, ChevronRight } from 'lucide-react';
import { StateDetail } from '../details/StateDetail';
import { vscode } from '../../utils/vscodeApi';
import type { StateMessage } from '../../../shared/types';

interface StateEventProps {
  event: StateMessage;
  isSelected: boolean;
  onSelect: () => void;
  showNetworkColumn?: boolean;
}

const storeConfig: Record<string, { label: string; badgeClass: string }> = {
  Redux: {
    label: 'REDUX',
    badgeClass: 'badge badge-redux',
  },
  Zustand: {
    label: 'ZUSTAND',
    badgeClass: 'badge badge-zustand',
  },
  MobX: {
    label: 'MOBX',
    badgeClass: 'badge badge-mobx',
  },
  Recoil: {
    label: 'RECOIL',
    badgeClass: 'badge badge-recoil',
  },
  default: {
    label: 'STATE',
    badgeClass: 'badge badge-state',
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

function getActionPreview(actionType?: string, action?: unknown): string {
  if (actionType && actionType !== 'state_change') {
    return actionType;
  }
  if (action && typeof action === 'object') {
    const keys = Object.keys(action);
    if (keys.length > 0) {
      return keys.slice(0, 3).join(', ') + (keys.length > 3 ? '...' : '');
    }
  }
  return 'State Change';
}

export function StateEvent({ event, isSelected, onSelect, showNetworkColumn = true }: StateEventProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { storeName, actionType, action, prevState, nextState } = event.payload;

  const config = storeConfig[storeName || ''] || storeConfig.default;

  const handleClick = useCallback(() => {
    setIsExpanded((prev) => !prev);
    onSelect();
  }, [onSelect]);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const content = JSON.stringify(
        {
          storeName,
          actionType,
          action,
          prevState,
          nextState,
        },
        null,
        2
      );
      vscode.send({ type: 'copy', payload: content });
    },
    [storeName, actionType, action, prevState, nextState]
  );

  return (
    <Fragment>
      <tr className="log-row cursor-pointer" onClick={handleClick}>
        {/* Expand button column */}
        <td className="py-2.5 px-4">
          <button className={`expand-btn ${isExpanded ? 'expanded' : ''}`}>
            <ChevronRight size={12} />
          </button>
        </td>

        {/* Type/Badge column */}
        <td className="py-2.5 px-4">
          <span className={config.badgeClass}>
            {config.label}
          </span>
        </td>

        {/* Message column */}
        <td className="py-2.5 px-4">
          <div className="text-text-primary">
            {!isExpanded && (
              <span className="log-message">
                <span className="text-accent-purple font-medium">{getActionPreview(actionType, action)}</span>
              </span>
            )}
            {isExpanded && (
              <div className="expanded-content mt-2" onClick={(e) => e.stopPropagation()}>
                <StateDetail
                  prevState={prevState}
                  nextState={nextState}
                  action={action}
                  actionType={actionType}
                />
              </div>
            )}
          </div>
        </td>

        {/* Time column (not applicable for state) */}
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
