import { scanText } from '@/features/privacy/privacyScanner';

export interface SensitiveRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG']);

export function detectSensitiveRects(): SensitiveRect[] {
  const rects: SensitiveRect[] = [];
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.textContent?.trim();
    if (!text || text.length < 4) continue;

    const parent = node.parentElement;
    if (!parent || SKIP_TAGS.has(parent.tagName)) continue;
    if (parent.closest('[data-ctrlweb-ui]')) continue;

    const result = scanText(text);
    if (result.issues.length === 0) continue;

    const range = document.createRange();
    try {
      range.selectNodeContents(node);
      const clientRects = range.getClientRects();
      for (let i = 0; i < clientRects.length; i++) {
        const r = clientRects[i];
        if (r.width < 2 || r.height < 2) continue;
        rects.push({
          x: r.left + scrollX,
          y: r.top + scrollY,
          width: r.width,
          height: r.height,
        });
      }
    } catch {
      // Range may fail on some nodes
    }
  }

  return mergeOverlappingRects(rects);
}

function mergeOverlappingRects(rects: SensitiveRect[]): SensitiveRect[] {
  if (rects.length <= 1) return rects;
  const merged: SensitiveRect[] = [];
  const used = new Set<number>();

  for (let i = 0; i < rects.length; i++) {
    if (used.has(i)) continue;
    let { x, y, width, height } = rects[i];
    used.add(i);

    for (let j = i + 1; j < rects.length; j++) {
      if (used.has(j)) continue;
      const other = rects[j];
      if (rectsOverlap({ x, y, width, height }, other, 4)) {
        const x2 = Math.min(x, other.x);
        const y2 = Math.min(y, other.y);
        const x3 = Math.max(x + width, other.x + other.width);
        const y3 = Math.max(y + height, other.y + other.height);
        x = x2;
        y = y2;
        width = x3 - x2;
        height = y3 - y2;
        used.add(j);
      }
    }
    merged.push({ x, y, width, height });
  }
  return merged;
}

function rectsOverlap(a: SensitiveRect, b: SensitiveRect, padding: number): boolean {
  return !(
    a.x + a.width + padding < b.x ||
    b.x + b.width + padding < a.x ||
    a.y + a.height + padding < b.y ||
    b.y + b.height + padding < a.y
  );
}

export function applyBlurRegions(
  ctx: CanvasRenderingContext2D,
  rects: SensitiveRect[],
  dpr: number
): void {
  for (const rect of rects) {
    const x = Math.round(rect.x * dpr);
    const y = Math.round(rect.y * dpr);
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (w < 1 || h < 1) continue;

    const blockSize = Math.max(6, Math.round(8 * dpr));
    for (let bx = x; bx < x + w; bx += blockSize) {
      for (let by = y; by < y + h; by += blockSize) {
        const bw = Math.min(blockSize, x + w - bx);
        const bh = Math.min(blockSize, y + h - by);
        let imageData: ImageData;
        try {
          imageData = ctx.getImageData(bx, by, bw, bh);
        } catch {
          continue;
        }
        const avg = averageColor(imageData);
        ctx.fillStyle = `rgb(${avg.r},${avg.g},${avg.b})`;
        ctx.fillRect(bx, by, bw, bh);
      }
    }
  }
}

function averageColor(imageData: ImageData): { r: number; g: number; b: number } {
  const d = imageData.data;
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i];
    g += d[i + 1];
    b += d[i + 2];
    count++;
  }
  if (!count) return { r: 26, g: 26, b: 31 };
  return { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
}
