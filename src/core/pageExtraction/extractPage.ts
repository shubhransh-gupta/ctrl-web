import { truncate } from '@/shared/utils';

const MAX_CONTENT_LENGTH = 50_000;

export interface ExtractedPage {
  title: string;
  description?: string;
  headings: string[];
  content: string;
}

export function extractPageContent(): ExtractedPage {
  const title = document.title.trim();
  const description =
    document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ||
    document.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim();

  const headings = Array.from(document.querySelectorAll('h1, h2, h3'))
    .map((el) => el.textContent?.trim() ?? '')
    .filter(Boolean)
    .slice(0, 30);

  const article =
    document.querySelector('article') ||
    document.querySelector('[role="main"]') ||
    document.querySelector('main') ||
    document.body;

  const clone = article.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('script, style, noscript, nav, footer, aside, iframe').forEach((el) => el.remove());

  const content = truncate(clone.innerText.replace(/\s+/g, ' ').trim(), MAX_CONTENT_LENGTH);

  return { title, description, headings, content };
}
