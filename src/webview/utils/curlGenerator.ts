import type { NetworkPayload } from '../../shared/types';

/**
 * Generate a cURL command from a network request
 */
export function generateCurl(payload: NetworkPayload): string {
  const parts: string[] = ['curl'];

  // Add method (only if not GET, since GET is default)
  if (payload.method && payload.method.toUpperCase() !== 'GET') {
    parts.push(`-X ${payload.method.toUpperCase()}`);
  }

  // Add URL (quoted to handle special characters)
  parts.push(`'${escapeShellString(payload.url)}'`);

  // Add request headers
  if (payload.requestHeaders) {
    for (const [key, value] of Object.entries(payload.requestHeaders)) {
      // Skip pseudo-headers and some internal headers
      if (key.startsWith(':') || key.toLowerCase() === 'host') {
        continue;
      }

      // Redact authorization headers
      const displayValue = key.toLowerCase() === 'authorization'
        ? '[REDACTED]'
        : value;

      parts.push(`-H '${escapeShellString(key)}: ${escapeShellString(displayValue)}'`);
    }
  }

  // Add request body
  if (payload.requestBody) {
    const bodyStr = typeof payload.requestBody === 'string'
      ? payload.requestBody
      : JSON.stringify(payload.requestBody);

    parts.push(`-d '${escapeShellString(bodyStr)}'`);
  }

  // Join with line continuation for readability
  return parts.join(' \\\n  ');
}

/**
 * Escape a string for use in a shell command
 */
function escapeShellString(str: string): string {
  // Replace single quotes with escaped version
  return str.replace(/'/g, "'\\''");
}

/**
 * Generate a cURL command with all options for copying
 */
export function generateCurlFull(payload: NetworkPayload): string {
  const parts: string[] = ['curl'];

  // Add verbose flag for more info
  parts.push('-v');

  // Add method
  if (payload.method) {
    parts.push(`-X ${payload.method.toUpperCase()}`);
  }

  // Add URL
  parts.push(`'${escapeShellString(payload.url)}'`);

  // Add all request headers
  if (payload.requestHeaders) {
    for (const [key, value] of Object.entries(payload.requestHeaders)) {
      if (key.startsWith(':')) continue;

      const displayValue = key.toLowerCase() === 'authorization'
        ? '[REDACTED - Replace with actual value]'
        : value;

      parts.push(`-H '${escapeShellString(key)}: ${escapeShellString(displayValue)}'`);
    }
  }

  // Add request body
  if (payload.requestBody) {
    const bodyStr = typeof payload.requestBody === 'string'
      ? payload.requestBody
      : JSON.stringify(payload.requestBody, null, 2);

    parts.push(`-d '${escapeShellString(bodyStr)}'`);
  }

  return parts.join(' \\\n  ');
}
