import type { ExplainInput, ExplanationProvider, ExplanationResult } from '@/shared/types';

const HTTP_ERRORS: Record<string, ExplanationResult> = {
  '400': {
    title: '400 Bad Request',
    source: 'local',
    sections: [
      { title: 'What it means', content: 'The server could not understand the request due to invalid syntax or malformed data.' },
      { title: 'Common causes', content: ['Invalid form data', 'Malformed JSON payload', 'Missing required parameters', 'Invalid URL encoding'] },
      { title: 'What to try', content: ['Check your input data', 'Verify request format', 'Review API documentation', 'Try simplifying the request'] },
    ],
  },
  '401': {
    title: '401 Unauthorized',
    source: 'local',
    sections: [
      { title: 'What it means', content: 'The server requires authentication and didn\'t accept your current credentials.' },
      { title: 'Common causes', content: ['Missing authentication', 'Expired token', 'Invalid credentials', 'Session expired'] },
      { title: 'What to try', content: ['Sign in again', 'Check your credentials', 'Refresh the page', 'Clear cookies and retry'] },
    ],
  },
  '403': {
    title: '403 Forbidden',
    source: 'local',
    sections: [
      { title: 'What it means', content: 'The server understood the request but refuses to authorize it.' },
      { title: 'Common causes', content: ['Insufficient permissions', 'IP blocked', 'Account restricted', 'Resource access denied'] },
      { title: 'What to try', content: ['Check your account permissions', 'Contact the administrator', 'Verify you have access', 'Try a different account'] },
    ],
  },
  '404': {
    title: '404 Not Found',
    source: 'local',
    sections: [
      { title: 'What it means', content: 'The requested resource could not be found on the server.' },
      { title: 'Common causes', content: ['URL typo', 'Page moved or deleted', 'Broken link', 'Resource no longer exists'] },
      { title: 'What to try', content: ['Check the URL spelling', 'Go to the homepage', 'Search for the content', 'Use the site navigation'] },
    ],
  },
  '429': {
    title: '429 Too Many Requests',
    source: 'local',
    sections: [
      { title: 'What it means', content: 'You\'ve sent too many requests in a given time period (rate limiting).' },
      { title: 'Common causes', content: ['API rate limit exceeded', 'Too many login attempts', 'Automated requests detected', 'Shared IP throttling'] },
      { title: 'What to try', content: ['Wait and retry later', 'Reduce request frequency', 'Check rate limit headers', 'Use exponential backoff'] },
    ],
  },
  '500': {
    title: '500 Internal Server Error',
    source: 'local',
    sections: [
      { title: 'What it means', content: 'The server encountered an unexpected condition that prevented it from fulfilling the request.' },
      { title: 'Common causes', content: ['Server-side bug', 'Database error', 'Misconfiguration', 'Unhandled exception'] },
      { title: 'What to try', content: ['Refresh the page', 'Try again later', 'Contact support if persistent', 'Check service status page'] },
    ],
  },
  '502': {
    title: '502 Bad Gateway',
    source: 'local',
    sections: [
      { title: 'What it means', content: 'A gateway or proxy server received an invalid response from an upstream server.' },
      { title: 'Common causes', content: ['Upstream server down', 'Network issues', 'Timeout', 'Deployment in progress'] },
      { title: 'What to try', content: ['Wait and retry', 'Check service status', 'Try a different network', 'Contact the service provider'] },
    ],
  },
  '503': {
    title: '503 Service Unavailable',
    source: 'local',
    sections: [
      { title: 'What it means', content: 'The server is temporarily unable to handle the request, often due to maintenance or overload.' },
      { title: 'Common causes', content: ['Scheduled maintenance', 'Server overload', 'Deployment', 'Resource exhaustion'] },
      { title: 'What to try', content: ['Wait and retry', 'Check status page', 'Try during off-peak hours', 'Subscribe to status updates'] },
    ],
  },
};

const TERMS: Record<string, ExplanationResult> = {
  cors: {
    title: 'CORS (Cross-Origin Resource Sharing)',
    source: 'local',
    sections: [
      { title: 'What it means', content: 'A browser security mechanism that controls which web pages can request resources from a different domain.' },
      { title: 'Common causes of errors', content: ['Missing Access-Control-Allow-Origin header', 'Preflight request blocked', 'Credentials not allowed', 'Wrong HTTP method allowed'] },
      { title: 'What to try', content: ['Configure server CORS headers', 'Use a proxy in development', 'Check allowed origins list', 'Verify preflight handling'] },
    ],
  },
  jwt: {
    title: 'JWT (JSON Web Token)',
    source: 'local',
    sections: [
      { title: 'What it means', content: 'A compact, URL-safe token format used to securely transmit claims between parties, commonly used for authentication.' },
      { title: 'Structure', content: ['Header — algorithm and token type', 'Payload — claims/data', 'Signature — verifies integrity'] },
      { title: 'What to watch for', content: ['Never expose tokens in URLs', 'Check expiration', 'Validate on server side', 'Use HTTPS always'] },
    ],
  },
  api: {
    title: 'API (Application Programming Interface)',
    source: 'local',
    sections: [
      { title: 'What it means', content: 'A set of rules and protocols that allows different software applications to communicate with each other.' },
      { title: 'Common types', content: ['REST — resource-based HTTP APIs', 'GraphQL — query language for APIs', 'WebSocket — real-time bidirectional', 'gRPC — high-performance RPC'] },
    ],
  },
  oauth: {
    title: 'OAuth',
    source: 'local',
    sections: [
      { title: 'What it means', content: 'An authorization framework that enables applications to obtain limited access to user accounts on other services.' },
      { title: 'Key concepts', content: ['Authorization code flow', 'Access tokens', 'Refresh tokens', 'Scopes define permissions'] },
    ],
  },
  ssl: {
    title: 'SSL/TLS',
    source: 'local',
    sections: [
      { title: 'What it means', content: 'Cryptographic protocols that provide secure communication over a network, indicated by HTTPS in URLs.' },
      { title: 'Why it matters', content: ['Encrypts data in transit', 'Verifies server identity', 'Prevents tampering', 'Required for modern web features'] },
    ],
  },
  cache: {
    title: 'Cache',
    source: 'local',
    sections: [
      { title: 'What it means', content: 'Temporary storage that saves copies of data so future requests can be served faster without re-fetching.' },
      { title: 'Types', content: ['Browser cache', 'CDN cache', 'Server-side cache', 'Application cache (Redis, Memcached)'] },
    ],
  },
  dom: {
    title: 'DOM (Document Object Model)',
    source: 'local',
    sections: [
      { title: 'What it means', content: 'A programming interface for HTML documents that represents the page structure as a tree of objects that can be manipulated with JavaScript.' },
    ],
  },
  cdn: {
    title: 'CDN (Content Delivery Network)',
    source: 'local',
    sections: [
      { title: 'What it means', content: 'A distributed network of servers that deliver web content to users based on their geographic location for faster loading.' },
    ],
  },
};

function matchHttpError(text: string): ExplanationResult | null {
  const match = text.match(/\b([45]\d{2})\s+(?:[A-Za-z]+\s*)?(?:Unauthorized|Forbidden|Not Found|Bad Request|Internal Server Error|Bad Gateway|Service Unavailable|Too Many Requests)?/i);
  if (match) {
    const code = match[1];
    if (HTTP_ERRORS[code]) return HTTP_ERRORS[code];
  }
  const codeOnly = text.match(/\b([45]\d{2})\b/);
  if (codeOnly && HTTP_ERRORS[codeOnly[1]]) return HTTP_ERRORS[codeOnly[1]];
  return null;
}

function matchTerm(text: string): ExplanationResult | null {
  const lower = text.toLowerCase().trim();
  for (const [key, explanation] of Object.entries(TERMS)) {
    if (lower === key || lower.includes(key)) return explanation;
  }
  return null;
}

export class LocalExplanationProvider implements ExplanationProvider {
  async explain(input: ExplainInput): Promise<ExplanationResult> {
    const text = input.text.trim();
    const httpError = matchHttpError(text);
    if (httpError) return httpError;
    const term = matchTerm(text);
    if (term) return term;

    return {
      title: text.slice(0, 60),
      source: 'local',
      sections: [
        {
          title: 'What we found',
          content: `No local explanation available for "${text.slice(0, 100)}". Enable AI features in settings for deeper explanations.`,
        },
        {
          title: 'Tip',
          content: 'Try selecting a specific HTTP error code, technical term, or developer concept.',
        },
      ],
    };
  }
}

export function getExplanationProvider(aiEnabled: boolean): ExplanationProvider {
  if (aiEnabled) {
    return new LocalExplanationProvider();
  }
  return new LocalExplanationProvider();
}
