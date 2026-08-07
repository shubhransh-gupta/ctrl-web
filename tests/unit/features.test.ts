import { describe, it, expect } from 'vitest';
import { cleanUrl } from '@/features/cleanLink/cleanLink';
import { cleanText, formatCleanText } from '@/features/copyClean/copyClean';
import { scanText, redactText } from '@/features/privacy/privacyScanner';
import { fuzzyMatch } from '@/shared/utils';

describe('cleanUrl', () => {
  it('removes utm tracking parameters', () => {
    const result = cleanUrl('https://example.com/article?utm_source=twitter&utm_medium=social&id=123');
    expect(result.cleaned).toBe('https://example.com/article?id=123');
    expect(result.removedParams).toContain('utm_source');
    expect(result.removedParams).toContain('utm_medium');
  });

  it('removes fbclid and gclid', () => {
    const result = cleanUrl('https://example.com/page?fbclid=abc123&gclid=xyz');
    expect(result.cleaned).toBe('https://example.com/page');
    expect(result.removedParams).toContain('fbclid');
  });

  it('preserves safe parameters', () => {
    const result = cleanUrl('https://example.com/search?q=test&page=2');
    expect(result.cleaned).toContain('q=test');
    expect(result.cleaned).toContain('page=2');
  });

  it('handles invalid URLs gracefully', () => {
    const result = cleanUrl('not a valid url !!!');
    expect(result.original).toBe('not a valid url !!!');
  });
});

describe('cleanText', () => {
  it('removes clutter lines', () => {
    const raw = `Article Title\n\nADVERTISEMENT\n\nThis is the article.\n\nShare\nFacebook\nTwitter`;
    const cleaned = cleanText(raw);
    expect(cleaned).toContain('Article Title');
    expect(cleaned).toContain('This is the article.');
    expect(cleaned).not.toContain('ADVERTISEMENT');
    expect(cleaned).not.toContain('Facebook');
  });

  it('normalizes excessive whitespace', () => {
    const raw = 'Hello    world\n\n\n\n\nTest';
    const cleaned = cleanText(raw);
    expect(cleaned).toBe('Hello world\n\nTest');
  });

  it('formats as markdown', () => {
    const result = formatCleanText('Hello world', 'markdown');
    expect(result).toBe('Hello world');
  });
});

describe('privacyScanner', () => {
  it('detects email addresses', () => {
    const result = scanText('Contact me at shubhransh@example.com for details');
    expect(result.issues.some((i) => i.type === 'email')).toBe(true);
  });

  it('detects JWT tokens', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    const result = scanText(`Token: ${jwt}`);
    expect(result.issues.some((i) => i.type === 'jwt')).toBe(true);
  });

  it('redacts detected values', () => {
    const text = 'Email: test@example.com';
    const result = scanText(text);
    const redacted = redactText(text, result.issues);
    expect(redacted).not.toContain('test@example.com');
    expect(redacted).toContain('[REDACTED:email]');
  });

  it('detects internal URLs', () => {
    const result = scanText('Server at http://192.168.1.1/admin');
    expect(result.issues.some((i) => i.type === 'internal_url')).toBe(true);
  });
});

describe('fuzzyMatch', () => {
  it('returns high score for exact substring match', () => {
    expect(fuzzyMatch('copy', 'Copy clean')).toBeGreaterThan(0.5);
  });

  it('returns 1 for empty query', () => {
    expect(fuzzyMatch('', 'anything')).toBe(1);
  });

  it('returns 0 for no match', () => {
    expect(fuzzyMatch('xyzabc', 'hello world')).toBe(0);
  });
});

describe('command filtering', () => {
  it('filters features by keyword', () => {
    const features = ['Copy clean', 'Clean this page', 'Screenshot', 'Check privacy'];
    const query = 'copy';
    const filtered = features.filter((f) => fuzzyMatch(query, f) > 0);
    expect(filtered).toContain('Copy clean');
    expect(filtered).not.toContain('Screenshot');
  });
});
