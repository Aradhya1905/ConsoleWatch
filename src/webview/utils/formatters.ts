/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || bytes === null || bytes === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  if (i === 0) {
    return `${bytes} B`;
  }

  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

/**
 * Format duration in milliseconds to human readable string
 */
export function formatDuration(ms: number | undefined): string {
  if (ms === undefined || ms === null) {
    return '-';
  }

  if (ms < 1) {
    return '<1ms';
  }

  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format a URL to display version (pathname + search, no truncation)
 */
export function formatUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const displayUrl = urlObj.pathname + urlObj.search;
    return displayUrl || '/';
  } catch {
    return url;
  }
}

/**
 * Get the hostname from a URL
 */
export function getHostname(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

/**
 * Get the status code category (2xx, 3xx, 4xx, 5xx)
 */
export function getStatusCategory(status: number | undefined): string {
  if (status === undefined || status === null || status === 0) {
    return 'error';
  }

  const category = Math.floor(status / 100);
  return `${category}xx`;
}

/**
 * Get CSS class for status code
 */
export function getStatusClass(status: number | undefined): string {
  const category = getStatusCategory(status);

  switch (category) {
    case '2xx':
      return 'status-2xx';
    case '3xx':
      return 'status-3xx';
    case '4xx':
      return 'status-4xx';
    case '5xx':
      return 'status-5xx';
    default:
      return 'status-5xx';
  }
}

/**
 * Get CSS class for HTTP method
 */
export function getMethodClass(method: string): string {
  const normalizedMethod = method.toUpperCase();

  switch (normalizedMethod) {
    case 'GET':
      return 'method-get';
    case 'POST':
      return 'method-post';
    case 'PUT':
      return 'method-put';
    case 'DELETE':
      return 'method-delete';
    case 'PATCH':
      return 'method-patch';
    default:
      return 'method-get';
  }
}
