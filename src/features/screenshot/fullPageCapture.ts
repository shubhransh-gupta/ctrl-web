import type { ScreenshotFormat } from '@/shared/types';
import { hideExtensionUi, waitForRepaint } from './hideExtensionUi';

async function captureVisibleTabRaw(format: ScreenshotFormat = 'png', quality = 92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'CAPTURE_VISIBLE_TAB', payload: { format, quality } },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response?.success) {
          reject(new Error(response?.error ?? 'Capture failed'));
          return;
        }
        fetch(response.dataUrl)
          .then((r) => r.blob())
          .then(resolve)
          .catch(reject);
      }
    );
  });
}

/** Capture visible tab, hiding all CTRL+WEB overlays first so they are not in the shot. */
export async function captureVisibleTab(format: ScreenshotFormat = 'png', quality = 92): Promise<Blob> {
  const restore = hideExtensionUi();
  await waitForRepaint();
  try {
    return await captureVisibleTabRaw(format, quality);
  } finally {
    restore();
  }
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface FullPageCaptureProgress {
  current: number;
  total: number;
}

export async function captureFullPage(
  onProgress?: (p: FullPageCaptureProgress) => void
): Promise<Blob> {
  const restoreUi = hideExtensionUi();
  await waitForRepaint();
  const originalScrollX = window.scrollX;
  const originalScrollY = window.scrollY;

  const dpr = window.devicePixelRatio || 1;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const totalWidth = Math.max(
    document.body.scrollWidth,
    document.documentElement.scrollWidth,
    viewportWidth
  );
  const totalHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    viewportHeight
  );

  const scrollPositions: number[] = [];
  if (totalHeight <= viewportHeight) {
    scrollPositions.push(0);
  } else {
    let y = 0;
    while (y < totalHeight - viewportHeight) {
      scrollPositions.push(y);
      y += viewportHeight;
    }
    scrollPositions.push(totalHeight - viewportHeight);
  }

  const captures: { scrollY: number; img: HTMLImageElement }[] = [];

  try {
    for (let i = 0; i < scrollPositions.length; i++) {
      onProgress?.({ current: i + 1, total: scrollPositions.length });
      window.scrollTo(0, scrollPositions[i]);
      await wait(150);

      const blob = await captureVisibleTabRaw('png');
      const img = await loadImage(blob);
      captures.push({ scrollY: scrollPositions[i], img });
    }

    const canvas = document.createElement('canvas');
    canvas.width = totalWidth * dpr;
    canvas.height = totalHeight * dpr;
    const ctx = canvas.getContext('2d')!;

    if (captures.length === 1) {
      ctx.drawImage(captures[0].img, 0, 0);
    } else {
      for (let i = 0; i < captures.length; i++) {
        const { scrollY, img } = captures[i];
        const destY = scrollY * dpr;
        const remainingHeight = totalHeight - scrollY;
        const sliceHeight = Math.min(viewportHeight, remainingHeight);
        ctx.drawImage(
          img,
          0,
          0,
          viewportWidth * dpr,
          sliceHeight * dpr,
          0,
          destY,
          viewportWidth * dpr,
          sliceHeight * dpr
        );
      }
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to create full page image'));
      }, 'image/png');
    });
  } finally {
    window.scrollTo(originalScrollX, originalScrollY);
    restoreUi();
  }
}

export async function cropSelection(
  x: number,
  y: number,
  w: number,
  h: number
): Promise<Blob> {
  const fullBlob = await captureVisibleTab('png');
  const img = await loadImage(fullBlob);
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, x * dpr, y * dpr, w * dpr, h * dpr, 0, 0, w * dpr, h * dpr);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to crop'));
    }, 'image/png');
  });
}
