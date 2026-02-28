import React, { useState, useCallback } from 'react';
import { Copy, FileText, Download, Clock, Terminal, ArrowUpRight, ArrowDownLeft, Braces, Activity } from 'lucide-react';
import { JsonView } from '../shared/JsonTree';
import { formatBytes, formatDuration } from '../../utils/formatters';
import { generateCurl } from '../../utils/curlGenerator';
import { vscode } from '../../utils/vscodeApi';
import type { NetworkPayload } from '../../../shared/types';

interface NetworkDetailProps {
  payload: NetworkPayload;
}

type DetailTab = 'headers' | 'request' | 'response' | 'timing' | 'curl';

export function NetworkDetail({ payload }: NetworkDetailProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('headers');

  const handleCopy = useCallback((content: string) => {
    vscode.send({ type: 'copy', payload: content });
  }, []);

  const handleCopyCurl = useCallback(() => {
    const curl = generateCurl(payload);
    vscode.send({ type: 'copy', payload: curl });
  }, [payload]);

  const tabs: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
    { id: 'headers', label: 'Headers', icon: <FileText size={12} /> },
    { id: 'response', label: 'Response', icon: <Download size={12} /> },
    { id: 'timing', label: 'Timing', icon: <Clock size={12} /> },
    { id: 'curl', label: 'cURL', icon: <Terminal size={12} /> },
  ];

  // Add request tab if there's a request body
  if (payload.requestBody && Object.keys(payload.requestBody as object).length > 0) {
    tabs.splice(1, 0, { id: 'request', label: 'Payload', icon: <Braces size={12} /> });
  }

  return (
    <div className="bg-bg-primary border-t border-border-subtle/50 overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b border-border-subtle/50 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`detail-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4 max-h-[400px] overflow-auto">
        {activeTab === 'headers' && (
          <HeadersTab
            requestHeaders={payload.requestHeaders}
            responseHeaders={payload.responseHeaders}
            onCopy={handleCopy}
          />
        )}

        {activeTab === 'request' && (
          <RequestTab body={payload.requestBody} onCopy={handleCopy} />
        )}

        {activeTab === 'response' && (
          <ResponseTab
            body={payload.responseBody}
            status={payload.status}
            statusText={payload.statusText}
            error={payload.error}
            onCopy={handleCopy}
          />
        )}

        {activeTab === 'timing' && (
          <TimingTab duration={payload.duration} size={payload.size} />
        )}

        {activeTab === 'curl' && (
          <CurlTab payload={payload} onCopy={handleCopyCurl} />
        )}
      </div>
    </div>
  );
}

// Headers Tab Component
function HeadersTab({
  requestHeaders,
  responseHeaders,
  onCopy,
}: {
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  onCopy: (content: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Request Headers */}
      <div>
        <h4 className="text-[11px] font-medium text-text-secondary mb-3 flex items-center gap-2">
          <ArrowUpRight size={12} className="text-text-muted" />
          Request Headers
        </h4>
        {requestHeaders && Object.keys(requestHeaders).length > 0 ? (
          <div className="code-block p-3 space-y-1.5">
            {Object.entries(requestHeaders).map(([key, value]) => (
              <div key={key}>
                <span className="kv-key">{key}:</span>{' '}
                <span className="kv-value">{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-text-muted">No request headers</div>
        )}
      </div>

      {/* Response Headers */}
      <div>
        <h4 className="text-[11px] font-medium text-text-secondary mb-3 flex items-center gap-2">
          <ArrowDownLeft size={12} className="text-text-muted" />
          Response Headers
        </h4>
        {responseHeaders && Object.keys(responseHeaders).length > 0 ? (
          <div className="code-block p-3 space-y-1.5">
            {Object.entries(responseHeaders).map(([key, value]) => (
              <div key={key}>
                <span className="kv-key">{key}:</span>{' '}
                <span className="kv-value">{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-text-muted">No response headers</div>
        )}
      </div>
    </div>
  );
}

// Request Tab Component
function RequestTab({
  body,
  onCopy,
}: {
  body: unknown;
  onCopy: (content: string) => void;
}) {
  if (!body || (typeof body === 'object' && Object.keys(body as object).length === 0)) {
    return (
      <div className="flex items-center justify-center py-8 text-text-muted text-sm">
        No request body
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[11px] font-medium text-text-secondary flex items-center gap-2">
          <Braces size={12} className="text-text-muted" />
          Request Body
        </h4>
        <button
          onClick={() =>
            onCopy(typeof body === 'string' ? body : JSON.stringify(body, null, 2))
          }
          className="copy-btn always-visible"
          title="Copy request body"
        >
          <Copy size={14} />
        </button>
      </div>
      <div className="code-block p-3">
        {typeof body === 'string' ? (
          <pre className="text-text-secondary whitespace-pre-wrap">{body}</pre>
        ) : (
          <JsonView data={body} initialExpanded={true} />
        )}
      </div>
    </div>
  );
}

// Response Tab Component
function ResponseTab({
  body,
  status,
  statusText,
  error,
  onCopy,
}: {
  body: unknown;
  status?: number;
  statusText?: string;
  error?: string;
  onCopy: (content: string) => void;
}) {
  if (error) {
    return (
      <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
        <div className="text-red-400 font-medium mb-1">Request Failed</div>
        <div className="text-sm text-text-secondary">{error}</div>
      </div>
    );
  }

  return (
    <div>
      {/* Status line */}
      {status && (
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border-subtle/50">
          <span className="text-sm font-medium text-text-primary">
            {status} {statusText}
          </span>
        </div>
      )}

      {body !== undefined && body !== null ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-medium text-text-secondary flex items-center gap-2">
              <Braces size={12} className="text-text-muted" />
              Response Body
            </h4>
            <button
              onClick={() =>
                onCopy(typeof body === 'string' ? body : JSON.stringify(body, null, 2))
              }
              className="copy-btn always-visible"
              title="Copy response body"
            >
              <Copy size={14} />
            </button>
          </div>
          <div className="code-block p-3">
            {typeof body === 'string' ? (
              <pre className="text-text-secondary whitespace-pre-wrap">{body}</pre>
            ) : (
              <JsonView data={body} initialExpanded={true} />
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-8 text-text-muted text-sm">
          No response body
        </div>
      )}
    </div>
  );
}

// Timing Tab Component
function TimingTab({
  duration,
  size,
}: {
  duration?: number;
  size?: number;
}) {
  return (
    <div>
      <h4 className="text-[11px] font-medium text-text-secondary mb-3 flex items-center gap-2">
        <Activity size={12} className="text-text-muted" />
        Request Timing
      </h4>

      <div className="space-y-3">
        {/* Total Duration */}
        <div className="flex items-center gap-3">
          <span className="text-text-muted w-28 text-[11px]">Total Duration</span>
          <div className="timing-bar flex-1">
            <div
              className="timing-bar-fill bg-blue-500/70"
              style={{ width: duration ? `${Math.min((duration / 2000) * 100, 100)}%` : '0%' }}
            />
          </div>
          <span className="text-text-primary w-14 text-right text-[11px] font-semibold">
            {formatDuration(duration)}
          </span>
        </div>

        {/* Response Size */}
        <div className="flex items-center gap-3 pt-3 mt-1 border-t border-border-subtle/50">
          <span className="text-text-secondary w-28 text-[11px] font-medium">Response Size</span>
          <div className="flex-1"></div>
          <span className="text-accent-cyan w-14 text-right text-[11px] font-semibold">
            {formatBytes(size)}
          </span>
        </div>
      </div>
    </div>
  );
}

// cURL Tab Component
function CurlTab({
  payload,
  onCopy,
}: {
  payload: NetworkPayload;
  onCopy: () => void;
}) {
  const curlCommand = generateCurl(payload);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[11px] font-medium text-text-secondary flex items-center gap-2">
          <Terminal size={12} className="text-text-muted" />
          cURL Command
        </h4>
        <button onClick={onCopy} className="btn btn-secondary gap-2">
          <Copy size={14} />
          Copy cURL
        </button>
      </div>
      <div className="code-block p-3 text-accent-green">{curlCommand}</div>
    </div>
  );
}
