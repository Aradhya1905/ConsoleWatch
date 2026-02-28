import React, { useState, useMemo, useCallback } from 'react';
import { JsonView } from '../shared/JsonTree';
import { Plus, Minus, RefreshCw } from 'lucide-react';
import { useEventStore } from '../../store/eventStore';

interface StateDetailProps {
  prevState: unknown;
  nextState: unknown;
  action?: unknown;
  actionType?: string;
}

interface DiffEntry {
  type: 'added' | 'removed' | 'changed';
  path: string;
  prevValue?: unknown;
  nextValue?: unknown;
}

type DetailTab = 'diff' | 'fullState' | 'action';

export function computeStateDiff(prev: unknown, next: unknown, path: string = ''): DiffEntry[] {
  const diffs: DiffEntry[] = [];

  // Handle null/undefined cases
  if (prev === null || prev === undefined) {
    if (next !== null && next !== undefined) {
      if (typeof next === 'object' && !Array.isArray(next)) {
        Object.keys(next as object).forEach((key) => {
          diffs.push({
            type: 'added',
            path: path ? `${path}.${key}` : key,
            nextValue: (next as Record<string, unknown>)[key],
          });
        });
      } else {
        diffs.push({ type: 'added', path: path || 'root', nextValue: next });
      }
    }
    return diffs;
  }

  if (next === null || next === undefined) {
    if (typeof prev === 'object' && !Array.isArray(prev)) {
      Object.keys(prev as object).forEach((key) => {
        diffs.push({
          type: 'removed',
          path: path ? `${path}.${key}` : key,
          prevValue: (prev as Record<string, unknown>)[key],
        });
      });
    } else {
      diffs.push({ type: 'removed', path: path || 'root', prevValue: prev });
    }
    return diffs;
  }

  // Handle primitives
  if (typeof prev !== 'object' || typeof next !== 'object') {
    if (prev !== next) {
      diffs.push({ type: 'changed', path: path || 'root', prevValue: prev, nextValue: next });
    }
    return diffs;
  }

  // Handle arrays
  if (Array.isArray(prev) || Array.isArray(next)) {
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      diffs.push({ type: 'changed', path: path || 'root', prevValue: prev, nextValue: next });
    }
    return diffs;
  }

  // Handle objects
  const prevObj = prev as Record<string, unknown>;
  const nextObj = next as Record<string, unknown>;
  const allKeys = new Set([...Object.keys(prevObj), ...Object.keys(nextObj)]);

  allKeys.forEach((key) => {
    const currentPath = path ? `${path}.${key}` : key;
    const prevVal = prevObj[key];
    const nextVal = nextObj[key];

    if (!(key in prevObj)) {
      diffs.push({ type: 'added', path: currentPath, nextValue: nextVal });
    } else if (!(key in nextObj)) {
      diffs.push({ type: 'removed', path: currentPath, prevValue: prevVal });
    } else if (typeof prevVal === 'object' && typeof nextVal === 'object' && prevVal !== null && nextVal !== null) {
      // Recursively diff nested objects (limit depth)
      if (currentPath.split('.').length < 4) {
        diffs.push(...computeStateDiff(prevVal, nextVal, currentPath));
      } else if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) {
        diffs.push({ type: 'changed', path: currentPath, prevValue: prevVal, nextValue: nextVal });
      }
    } else if (prevVal !== nextVal) {
      diffs.push({ type: 'changed', path: currentPath, prevValue: prevVal, nextValue: nextVal });
    }
  });

  return diffs;
}

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') {
    try {
      const str = JSON.stringify(value);
      return str.length > 50 ? str.substring(0, 50) + '...' : str;
    } catch {
      return '[Object]';
    }
  }
  return String(value);
}

function isExpandableValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'object') return true;
  if (typeof value === 'string' && value.length > 50) return true;
  return false;
}

function ExpandableValue({ value, colorClass }: { value: unknown; colorClass: string }) {
  const [expanded, setExpanded] = useState(false);

  const isExpandable = isExpandableValue(value);
  const formatted = formatValue(value);
  const isTruncated = typeof value === 'object' && value !== null && formatted.endsWith('...');

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isExpandable) {
      e.stopPropagation();
      setExpanded((prev) => !prev);
    }
  }, [isExpandable]);

  if (!isExpandable) {
    return <span className={colorClass}>{formatted}</span>;
  }

  return (
    <span>
      {!expanded ? (
        <span
          className={`${colorClass} cursor-pointer hover:opacity-80`}
          onClick={handleClick}
        >
          {formatted}
          {isTruncated && (
            <span className="ml-1 px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted text-[10px] hover:bg-border-subtle transition-colors">
              expand
            </span>
          )}
        </span>
      ) : (
        <span onClick={(e) => e.stopPropagation()}>
          <span
            className={`${colorClass} cursor-pointer hover:opacity-80 text-[10px] ml-1 px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted hover:bg-border-subtle transition-colors`}
            onClick={handleClick}
          >
            collapse
          </span>
          <div className="mt-1 pl-2 border-l-2 border-border-subtle">
            <JsonView data={value} initialExpanded={true} />
          </div>
        </span>
      )}
    </span>
  );
}

export function StateDetail({ prevState, nextState, action, actionType }: StateDetailProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('diff');
  const stateFontSize = useEventStore((state) => state.stateFontSize);

  const diffs = useMemo(() => computeStateDiff(prevState, nextState), [prevState, nextState]);

  const addedDiffs = diffs.filter((d) => d.type === 'added');
  const removedDiffs = diffs.filter((d) => d.type === 'removed');
  const changedDiffs = diffs.filter((d) => d.type === 'changed');

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'diff', label: `Diff (${diffs.length})` },
    { id: 'fullState', label: 'Full State' },
    ...(action ? [{ id: 'action' as DetailTab, label: 'Action' }] : []),
  ];

  return (
    <div className="state-detail bg-bg-tertiary rounded-lg border border-border-subtle">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border-subtle">
        <div className="flex flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={(e) => { e.stopPropagation(); setActiveTab(tab.id); }}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-accent-blue border-b-2 border-accent-blue -mb-px'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* Content */}
      <div className="p-4 overflow-auto" style={{ fontSize: `${stateFontSize}px` }}>
        {activeTab === 'diff' && (
          <div className="space-y-4">
            {diffs.length === 0 ? (
              <div className="text-text-muted text-sm italic">No changes detected</div>
            ) : (
              <>
                {/* Changed items */}
                {changedDiffs.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-accent-amber mb-2">
                      <RefreshCw size={12} />
                      Changed ({changedDiffs.length})
                    </div>
                    <div className="space-y-1">
                      {changedDiffs.map((diff, i) => (
                        <div key={i} className="font-mono bg-bg-secondary rounded px-2 py-1">
                          <span className="text-text-muted">{diff.path}:</span>{' '}
                          <ExpandableValue value={diff.prevValue} colorClass="text-red-400 line-through" />
                          <span className="text-text-muted mx-1">→</span>
                          <ExpandableValue value={diff.nextValue} colorClass="text-green-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Added items */}
                {addedDiffs.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-green-400 mb-2">
                      <Plus size={12} />
                      Added ({addedDiffs.length})
                    </div>
                    <div className="space-y-1">
                      {addedDiffs.map((diff, i) => (
                        <div key={i} className="font-mono bg-bg-secondary rounded px-2 py-1">
                          <span className="text-text-muted">{diff.path}:</span>{' '}
                          <ExpandableValue value={diff.nextValue} colorClass="text-green-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Removed items */}
                {removedDiffs.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-xs font-medium text-red-400 mb-2">
                      <Minus size={12} />
                      Removed ({removedDiffs.length})
                    </div>
                    <div className="space-y-1">
                      {removedDiffs.map((diff, i) => (
                        <div key={i} className="font-mono bg-bg-secondary rounded px-2 py-1">
                          <span className="text-text-muted">{diff.path}:</span>{' '}
                          <ExpandableValue value={diff.prevValue} colorClass="text-red-400 line-through" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'fullState' && (
          <div className="bg-bg-secondary rounded p-2">
            <JsonView data={nextState} initialExpanded={false} />
          </div>
        )}

        {activeTab === 'action' && action != null && (
          <div>
            {actionType && (
              <div className="text-xs font-medium text-accent-purple mb-2">
                Action: {actionType}
              </div>
            )}
            <div className="bg-bg-secondary rounded p-2">
              <JsonView data={action} initialExpanded={true} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
