import type { ExplanationResult } from '@/shared/types';

const HTTP_ERRORS: Record<string, ExplanationResult> = {
  '401': {
    title: '401 Unauthorized',
    source: 'local',
    sections: [{ title: 'What it means', content: 'test' }],
  },
  '404': {
    title: '404 Not Found',
    source: 'local',
    sections: [{ title: 'What it means', content: 'test' }],
  },
};

export function matchHttpError(text: string): ExplanationResult | null {
  const match = text.match(/\b([45]\d{2})\s+(?:[A-Za-z]+\s*)?(?:Unauthorized|Forbidden|Not Found|Bad Request|Internal Server Error|Bad Gateway|Service Unavailable|Too Many Requests)?/i);
  if (match) {
    const code = match[1];
    if (HTTP_ERRORS[code]) return HTTP_ERRORS[code];
  }
  const codeOnly = text.match(/\b([45]\d{2})\b/);
  if (codeOnly && HTTP_ERRORS[codeOnly[1]]) return HTTP_ERRORS[codeOnly[1]];
  return null;
}
