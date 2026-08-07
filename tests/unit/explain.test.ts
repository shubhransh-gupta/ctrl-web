import { describe, it, expect } from 'vitest';
import { matchHttpError } from '@/features/explain/explainUtils';

describe('local explanation', () => {
  it('matches HTTP 401 errors', () => {
    const result = matchHttpError('401 Unauthorized');
    expect(result).not.toBeNull();
    expect(result!.title).toBe('401 Unauthorized');
    expect(result!.sections.some((s) => s.title === 'What it means')).toBe(true);
  });

  it('matches HTTP 404 errors', () => {
    const result = matchHttpError('404 Not Found');
    expect(result!.title).toBe('404 Not Found');
  });

  it('returns null for unknown text', () => {
    const result = matchHttpError('random unknown phrase');
    expect(result).toBeNull();
  });
});

describe('term matching', () => {
  it('matches CORS term', async () => {
    const { explainText } = await import('@/features/explain/explainService');
    const result = await explainText('CORS');
    expect(result.title).toContain('CORS');
    expect(result.source).toBe('local');
  });
});
