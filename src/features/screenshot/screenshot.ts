import type { ScreenshotFormat, ScreenshotMode } from '@/shared/types';
import { downloadBlob } from '@/shared/utils';
import { captureVisibleTab, captureFullPage, cropSelection } from './fullPageCapture';
import { openAnnotationEditor } from './annotationEditor';
import { showToast } from '@/content/overlay/toast';

export interface ScreenshotOptions {
  mode: ScreenshotMode;
  format: ScreenshotFormat;
  quality?: number;
  autoBlurSensitive?: boolean;
  annotate?: boolean;
}

export async function downloadScreenshot(blob: Blob, format: ScreenshotFormat): Promise<void> {
  const ext = format === 'jpeg' ? 'jpg' : 'png';
  const filename = `ctrlweb-screenshot-${Date.now()}.${ext}`;
  downloadBlob(blob, filename);
}

export async function copyScreenshotToClipboard(blob: Blob): Promise<void> {
  await navigator.clipboard.write([
    new ClipboardItem({ [blob.type]: blob }),
  ]);
}

export function createSelectionOverlay(): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const overlay = document.createElement('div');
    overlay.setAttribute('data-ctrlweb-ui', 'screenshot-overlay');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 2147483647;
      cursor: crosshair; background: rgba(0,0,0,0.3);
    `;

    const selection = document.createElement('div');
    selection.style.cssText = `
      position: fixed; border: 2px dashed #007aff;
      background: rgba(0,122,255,0.1); pointer-events: none; display: none;
    `;
    overlay.appendChild(selection);

    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
      background: #1a1a1f; border: 1px solid #2a2a32; border-radius: 8px;
      padding: 8px 16px; color: #e8e8ed; font-family: system-ui; font-size: 13px;
      display: flex; gap: 8px; align-items: center;
    `;
    toolbar.innerHTML = `
      <span>Drag to select area</span>
      <button id="ctrlweb-cancel" style="background:#2a2a32;border:1px solid #3a3a44;color:#e8e8ed;padding:4px 10px;border-radius:4px;cursor:pointer;">Cancel</button>
    `;
    overlay.appendChild(toolbar);

    let startX = 0, startY = 0, isDrawing = false;

    overlay.addEventListener('mousedown', (e) => {
      isDrawing = true;
      startX = e.clientX;
      startY = e.clientY;
      selection.style.display = 'block';
      selection.style.left = `${startX}px`;
      selection.style.top = `${startY}px`;
      selection.style.width = '0';
      selection.style.height = '0';
    });

    overlay.addEventListener('mousemove', (e) => {
      if (!isDrawing) return;
      const x = Math.min(startX, e.clientX);
      const y = Math.min(startY, e.clientY);
      selection.style.left = `${x}px`;
      selection.style.top = `${y}px`;
      selection.style.width = `${Math.abs(e.clientX - startX)}px`;
      selection.style.height = `${Math.abs(e.clientY - startY)}px`;
    });

    overlay.addEventListener('mouseup', async (e) => {
      if (!isDrawing) return;
      isDrawing = false;
      const x = Math.min(startX, e.clientX);
      const y = Math.min(startY, e.clientY);
      const w = Math.abs(e.clientX - startX);
      const h = Math.abs(e.clientY - startY);
      overlay.remove();

      if (w < 10 || h < 10) {
        reject(new Error('Selection too small'));
        return;
      }

      try {
        resolve(await cropSelection(x, y, w, h));
      } catch (err) {
        reject(err);
      }
    });

    toolbar.querySelector('#ctrlweb-cancel')?.addEventListener('click', () => {
      overlay.remove();
      reject(new Error('Cancelled'));
    });

    document.body.appendChild(overlay);
  });
}

export async function takeScreenshot(options: ScreenshotOptions): Promise<Blob> {
  if (options.mode === 'selection') {
    return createSelectionOverlay();
  }

  if (options.mode === 'full') {
    return captureFullPage();
  }

  return captureVisibleTab(options.format, options.quality);
}

export function showScreenshotPanel(): void {
  const existing = document.querySelector('[data-ctrlweb-ui="screenshot-panel"]');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.setAttribute('data-ctrlweb-ui', 'screenshot-panel');
  panel.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    background: #1a1a1f; border: 1px solid #2a2a32; border-radius: 12px;
    padding: 24px; z-index: 2147483647; width: 380px;
    font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    color: #e8e8ed; box-shadow: 0 16px 48px rgba(0,0,0,0.5);
  `;

  panel.innerHTML = `
    <div style="font-size:16px;font-weight:600;margin-bottom:16px;">📸 Screenshot</div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px;border-radius:6px;background:#0d0d10;">
        <input type="radio" name="mode" value="visible" checked> Visible page
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px;border-radius:6px;background:#0d0d10;">
        <input type="radio" name="mode" value="selection"> Selected area
      </label>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:8px;border-radius:6px;background:#0d0d10;">
        <input type="radio" name="mode" value="full"> Full page
      </label>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:12px;">
      <select id="format" style="flex:1;background:#0d0d10;border:1px solid #2a2a32;color:#e8e8ed;padding:6px 8px;border-radius:4px;">
        <option value="png">PNG</option>
        <option value="jpeg">JPEG</option>
      </select>
    </div>
    <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:12px;color:#8b8b96;cursor:pointer;">
      <input type="checkbox" id="auto-blur" checked> Auto-blur sensitive text
    </label>
    <label style="display:flex;align-items:center;gap:8px;margin-bottom:16px;font-size:12px;color:#8b8b96;cursor:pointer;">
      <input type="checkbox" id="annotate" checked> Annotate after capture
    </label>
    <div id="progress" style="display:none;font-size:12px;color:#8b8b96;margin-bottom:12px;"></div>
    <div style="display:flex;gap:8px;">
      <button id="capture" style="flex:1;background:#007aff;border:none;color:white;padding:8px;border-radius:6px;cursor:pointer;font-weight:500;">Capture</button>
      <button id="cancel" style="background:#2a2a32;border:1px solid #3a3a44;color:#e8e8ed;padding:8px 16px;border-radius:6px;cursor:pointer;">Cancel</button>
    </div>
    <div id="actions" style="display:none;margin-top:12px;gap:8px;">
      <button id="edit" style="flex:1;background:#2a2a32;border:1px solid #3a3a44;color:#e8e8ed;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;">Edit</button>
      <button id="download" style="flex:1;background:#2a2a32;border:1px solid #3a3a44;color:#e8e8ed;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;">Download</button>
      <button id="copy" style="flex:1;background:#2a2a32;border:1px solid #3a3a44;color:#e8e8ed;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;">Copy</button>
    </div>
  `;

  let capturedBlob: Blob | null = null;
  let lastOptions: ScreenshotOptions | null = null;

  panel.querySelector('#cancel')?.addEventListener('click', () => panel.remove());

  panel.querySelector('#capture')?.addEventListener('click', async () => {
    const mode = (panel.querySelector('input[name="mode"]:checked') as HTMLInputElement)?.value as ScreenshotMode;
    const format = (panel.querySelector('#format') as HTMLSelectElement)?.value as ScreenshotFormat;
    const autoBlurSensitive = (panel.querySelector('#auto-blur') as HTMLInputElement)?.checked ?? false;
    const annotate = (panel.querySelector('#annotate') as HTMLInputElement)?.checked ?? true;
    const progressEl = panel.querySelector('#progress') as HTMLElement;
    const captureBtn = panel.querySelector('#capture') as HTMLButtonElement;

    lastOptions = { mode, format, autoBlurSensitive, annotate };

    try {
      if (mode === 'selection') panel.style.display = 'none';
      captureBtn.disabled = true;
      captureBtn.textContent = 'Capturing...';

      if (mode === 'full') {
        progressEl.style.display = 'block';
        capturedBlob = await captureFullPage((p) => {
          progressEl.textContent = `Capturing ${p.current} of ${p.total}...`;
        });
        progressEl.style.display = 'none';
      } else {
        capturedBlob = await takeScreenshot({ mode, format });
      }

      if (mode === 'selection') panel.style.display = '';

      if (annotate) {
        captureBtn.textContent = 'Annotate...';
        capturedBlob = await openAnnotationEditor(capturedBlob!, { autoBlurSensitive, format });
      }

      (panel.querySelector('#actions') as HTMLElement).style.display = 'flex';
      showToast('✓ Screenshot captured');
    } catch (err) {
      if (mode === 'selection') panel.style.display = '';
      if (!(err instanceof Error && err.message === 'Cancelled')) {
        showToast(err instanceof Error ? err.message : 'Capture failed', 'error');
      }
    } finally {
      captureBtn.disabled = false;
      captureBtn.textContent = 'Capture';
      progressEl.style.display = 'none';
    }
  });

  panel.querySelector('#edit')?.addEventListener('click', async () => {
    if (!capturedBlob || !lastOptions) return;
    try {
      capturedBlob = await openAnnotationEditor(capturedBlob, {
        autoBlurSensitive: lastOptions.autoBlurSensitive,
        format: lastOptions.format,
      });
      showToast('✓ Annotations updated');
    } catch {
      // cancelled
    }
  });

  panel.querySelector('#download')?.addEventListener('click', async () => {
    if (capturedBlob && lastOptions) {
      await downloadScreenshot(capturedBlob, lastOptions.format);
      showToast('✓ Downloaded');
    }
  });

  panel.querySelector('#copy')?.addEventListener('click', async () => {
    if (capturedBlob) {
      await copyScreenshotToClipboard(capturedBlob);
      showToast('✓ Copied to clipboard');
    }
  });

  document.body.appendChild(panel);
}
