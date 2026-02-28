import React, { useState, useCallback, useMemo } from 'react';
import { ChevronRight, Braces, List } from 'lucide-react';
import { useEventStore, type JsonViewMode } from '../../store/eventStore';

interface JsonTreeProps {
  data: unknown;
  depth?: number;
  initialExpanded?: boolean;
}

// Renders an object inside an array with index + inline preview
function ArrayObjectItem({
  item,
  index,
  depth,
}: {
  item: Record<string, unknown>;
  index: number;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  const keys = Object.keys(item);

  // Build a compact preview from the first 2-3 key/value pairs
  const preview = useMemo(() => {
    const maxPairs = 3;
    const pairs: string[] = [];
    let totalLen = 0;
    for (let i = 0; i < keys.length && pairs.length < maxPairs; i++) {
      const k = keys[i];
      const v = item[k];
      let valStr: string;
      if (v === null) valStr = 'null';
      else if (typeof v === 'string') valStr = v.length > 20 ? `"${v.slice(0, 20)}…"` : `"${v}"`;
      else if (typeof v === 'number' || typeof v === 'boolean') valStr = String(v);
      else if (Array.isArray(v)) valStr = `[${v.length}]`;
      else if (typeof v === 'object') valStr = '{…}';
      else valStr = String(v);

      const pair = `${k}: ${valStr}`;
      totalLen += pair.length;
      if (totalLen > 60 && pairs.length > 0) break;
      pairs.push(pair);
    }
    const suffix = keys.length > pairs.length ? ', …' : '';
    return pairs.join(', ') + suffix;
  }, [item, keys]);

  if (!expanded) {
    return (
      <button
        onClick={toggle}
        className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary focus:outline-none cursor-pointer"
      >
        <ChevronRight size={10} />
        <span className="json-index">{index}</span>
        <span className="json-bracket">{'{'}</span>
        <span className="text-text-muted text-[10px] truncate max-w-[280px]">{preview}</span>
        <span className="json-bracket">{'}'}</span>
      </button>
    );
  }

  return (
    <div className="inline-block align-top">
      <button
        onClick={toggle}
        className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary focus:outline-none cursor-pointer"
      >
        <ChevronRight size={10} className="rotate-90" />
        <span className="json-index">{index}</span>
        <span className="json-bracket">{'{'}</span>
      </button>
      <div className="ml-6 pl-3 border-l border-border-subtle">
        {keys.map((key) => (
          <div key={key} className="py-[2px]">
            <span className="json-key">"{key}"</span>
            <span className="text-text-secondary">: </span>
            <JsonTree
              data={item[key]}
              depth={depth + 2}
              initialExpanded={false}
            />
          </div>
        ))}
      </div>
      <span className="json-bracket ml-4">{'}'}</span>
    </div>
  );
}

export function JsonTree({
  data,
  depth = 0,
  initialExpanded = false,
}: JsonTreeProps) {
  const [expanded, setExpanded] = useState(initialExpanded || depth < 1);

  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  if (data === null) {
    return <span className="json-null">null</span>;
  }

  if (data === undefined) {
    return <span className="json-null">undefined</span>;
  }

  if (typeof data === 'boolean') {
    return <span className="json-boolean">{String(data)}</span>;
  }

  if (typeof data === 'number') {
    return <span className="json-number">{data}</span>;
  }

  if (typeof data === 'string') {
    // Truncate long strings
    const displayValue = data.length > 100 ? `${data.slice(0, 100)}...` : data;
    return <span className="json-string">"{displayValue}"</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="json-bracket">[]</span>;
    }

    if (!expanded) {
      return (
        <button
          onClick={toggle}
          className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary focus:outline-none cursor-pointer"
        >
          <ChevronRight size={10} />
          <span className="json-bracket">[</span>
          <span className="text-text-muted text-[10px]">{data.length} items</span>
          <span className="json-bracket">]</span>
        </button>
      );
    }

    return (
      <div className="inline-block align-top">
        <button
          onClick={toggle}
          className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary focus:outline-none cursor-pointer"
        >
          <ChevronRight size={10} className="rotate-90" />
          <span className="json-bracket">[</span>
        </button>
        <div className="ml-6 pl-3 border-l border-border-subtle">
          {data.map((item, index) => (
            <div key={index} className="py-[2px]">
              {typeof item === 'object' && item !== null && !Array.isArray(item) ? (
                <ArrayObjectItem
                  item={item as Record<string, unknown>}
                  index={index}
                  depth={depth}
                />
              ) : (
                <JsonTree
                  data={item}
                  depth={depth + 1}
                  initialExpanded={false}
                />
              )}
            </div>
          ))}
        </div>
        <span className="json-bracket ml-4">]</span>
      </div>
    );
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data as object);
    if (keys.length === 0) {
      return <span className="json-bracket">{'{}'}</span>;
    }

    if (!expanded) {
      return (
        <button
          onClick={toggle}
          className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary focus:outline-none cursor-pointer"
        >
          <ChevronRight size={10} />
          <span className="json-bracket">{'{'}</span>
          <span className="text-text-muted text-[10px]">{keys.length} keys</span>
          <span className="json-bracket">{'}'}</span>
        </button>
      );
    }

    return (
      <div className="inline-block align-top">
        <button
          onClick={toggle}
          className="inline-flex items-center gap-1 text-text-secondary hover:text-text-primary focus:outline-none cursor-pointer"
        >
          <ChevronRight size={10} className="rotate-90" />
          <span className="json-bracket">{'{'}</span>
        </button>
        <div className="ml-6 pl-3 border-l border-border-subtle">
          {keys.map((key) => (
            <div key={key} className="py-[2px]">
              <span className="json-key">"{key}"</span>
              <span className="text-text-secondary">: </span>
              <JsonTree
                data={(data as Record<string, unknown>)[key]}
                depth={depth + 1}

                initialExpanded={false}
              />
            </div>
          ))}
        </div>
        <span className="json-bracket ml-4">{'}'}</span>
      </div>
    );
  }

  return <span className="text-text-muted">{String(data)}</span>;
}

// Compact preview for single-line display
export function JsonPreview({ data, maxLength = 80 }: { data: unknown; maxLength?: number }) {
  const preview = getPreviewString(data, maxLength);
  return <span className="font-mono text-text-secondary">{preview}</span>;
}

// Syntax-highlighted JSON code view (prettified raw JSON)
export function JsonCode({ data }: { data: unknown }) {
  const highlighted = useMemo(() => syntaxHighlight(data), [data]);
  return (
    <pre
      className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all m-0"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

function syntaxHighlight(data: unknown): string {
  let json: string;
  try {
    json = JSON.stringify(data, null, 2);
  } catch {
    return escapeHtml(String(data));
  }
  if (json === undefined) return escapeHtml(String(data));

  // Replace JSON tokens with syntax-highlighted spans
  return json.replace(
    /("(?:\\.|[^"\\])*")\s*(:)?|(\b(?:true|false)\b)|(\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}\[\]])/g,
    (match, str: string | undefined, colon: string | undefined, bool: string | undefined, nil: string | undefined, num: string | undefined, bracket: string | undefined) => {
      if (str) {
        const escaped = str; // already escaped by JSON.stringify
        if (colon) {
          return `<span class="json-key">${escaped}</span>:`;
        }
        return `<span class="json-string">${escaped}</span>`;
      }
      if (bool) return `<span class="json-boolean">${bool}</span>`;
      if (nil) return `<span class="json-null">${nil}</span>`;
      if (num) return `<span class="json-number">${num}</span>`;
      if (bracket) return `<span class="json-bracket">${bracket}</span>`;
      return match;
    }
  );
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Hybrid wrapper: global default from store + per-instance inline toggle
export function JsonView(props: JsonTreeProps) {
  const globalMode = useEventStore((state) => state.jsonViewMode);
  const [localOverride, setLocalOverride] = useState<JsonViewMode | null>(null);

  const activeMode = localOverride ?? globalMode;

  const handleToggle = useCallback((mode: JsonViewMode) => {
    setLocalOverride(mode === globalMode ? null : mode);
  }, [globalMode]);

  // Only show toggle for non-primitive data (objects/arrays)
  const isComplex = typeof props.data === 'object' && props.data !== null;

  if (!isComplex) {
    if (activeMode === 'code') {
      return <JsonCode data={props.data} />;
    }
    return <JsonTree {...props} />;
  }

  return (
    <div className="json-view-container">
      {/* Inline mode toggle */}
      <div className="json-view-toggle">
        <button
          onClick={() => handleToggle('code')}
          className={`json-view-toggle-btn ${activeMode === 'code' ? 'active' : ''}`}
          title="Code view"
        >
          <Braces size={11} />
          <span>Code</span>
        </button>
        <button
          onClick={() => handleToggle('tree')}
          className={`json-view-toggle-btn ${activeMode === 'tree' ? 'active' : ''}`}
          title="Tree view"
        >
          <List size={11} />
          <span>Tree</span>
        </button>
      </div>

      {/* Content with transition — key forces re-mount to re-trigger animation */}
      <div className="json-view-content" key={activeMode}>
        {activeMode === 'code' ? (
          <JsonCode data={props.data} />
        ) : (
          <JsonTree {...props} />
        )}
      </div>
    </div>
  );
}

function getPreviewString(data: unknown, maxLength: number): string {
  if (data === null) return 'null';
  if (data === undefined) return 'undefined';
  if (typeof data === 'boolean') return String(data);
  if (typeof data === 'number') return String(data);
  if (typeof data === 'string') {
    if (data.length > maxLength) {
      return `"${data.slice(0, maxLength)}..."`;
    }
    return `"${data}"`;
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return '[]';
    const str = JSON.stringify(data);
    if (str.length <= maxLength) return str;
    return `[${data.length} items]`;
  }
  if (typeof data === 'object') {
    const keys = Object.keys(data as object);
    if (keys.length === 0) return '{}';
    const str = JSON.stringify(data);
    if (str.length <= maxLength) return str;
    return `{${keys.length} keys}`;
  }
  return String(data);
}
