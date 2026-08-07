import { describe, it, expect } from 'vitest';
import { localSummarize, extractHeadings } from '@/features/summarize/localSummarize';

describe('localSummarize', () => {
  it('summarizes text with first sentences', () => {
    const text = 'First sentence here with enough words. Second sentence also has plenty of words. Third one too.';
    const result = localSummarize({ text });
    expect(result.summary).toBeTruthy();
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.source).toBe('local');
  });

  it('includes reading time', () => {
    const text = Array(100).fill('word').join(' ');
    const result = localSummarize({ text });
    expect(result.readingTime).toMatch(/min read/);
  });
});

describe('extractHeadings', () => {
  it('extracts headings from DOM', () => {
    document.body.innerHTML = '<h1>Title</h1><h2>Section</h2><p>Content</p>';
    const headings = extractHeadings();
    expect(headings).toContain('Title');
    expect(headings).toContain('Section');
  });
});
