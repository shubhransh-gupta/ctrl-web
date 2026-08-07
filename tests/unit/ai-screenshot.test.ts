import { describe, it, expect } from 'vitest';
import { parseExplanationResponse } from '@/shared/ai/aiClient';

describe('parseExplanationResponse', () => {
  it('parses markdown sections', () => {
    const text = `## What it means
This is an error code.

## Common causes
- Cause one
- Cause two

## What to try
Try refreshing the page.`;

    const result = parseExplanationResponse(text, '401 Unauthorized');
    expect(result.source).toBe('ai');
    expect(result.sections.length).toBeGreaterThanOrEqual(2);
    expect(result.title).toBe('401 Unauthorized');
  });

  it('falls back to single section for plain text', () => {
    const result = parseExplanationResponse('Simple explanation.', 'query');
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].content).toBe('Simple explanation.');
  });
});

describe('privacy integration for auto-blur', () => {
  it('detects email in page text for blur targeting', async () => {
    const { scanText } = await import('@/features/privacy/privacyScanner');
    const result = scanText('Contact test@example.com here');
    expect(result.issues.some((i) => i.type === 'email')).toBe(true);
  });
});
