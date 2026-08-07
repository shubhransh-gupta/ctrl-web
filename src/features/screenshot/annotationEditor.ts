import type { ScreenshotFormat } from '@/shared/types';
import { detectSensitiveRects, applyBlurRegions } from './autoBlur';
import { generateId } from '@/shared/utils';

type AnnotationTool = 'select' | 'rectangle' | 'arrow' | 'highlight' | 'blur' | 'text';

interface Point {
  x: number;
  y: number;
}

interface BaseAnnotation {
  id: string;
  tool: AnnotationTool;
}

interface RectAnnotation extends BaseAnnotation {
  tool: 'rectangle' | 'highlight' | 'blur';
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ArrowAnnotation extends BaseAnnotation {
  tool: 'arrow';
  from: Point;
  to: Point;
}

interface TextAnnotation extends BaseAnnotation {
  tool: 'text';
  x: number;
  y: number;
  text: string;
}

type Annotation = RectAnnotation | ArrowAnnotation | TextAnnotation;

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

function renderAnnotations(
  ctx: CanvasRenderingContext2D,
  annotations: Annotation[],
  dpr: number
): void {
  for (const ann of annotations) {
    switch (ann.tool) {
      case 'rectangle':
        ctx.strokeStyle = '#007aff';
        ctx.lineWidth = 2 * dpr;
        ctx.strokeRect(ann.x * dpr, ann.y * dpr, ann.width * dpr, ann.height * dpr);
        break;
      case 'highlight':
        ctx.fillStyle = 'rgba(255, 214, 10, 0.35)';
        ctx.fillRect(ann.x * dpr, ann.y * dpr, ann.width * dpr, ann.height * dpr);
        break;
      case 'blur':
        applyBlurRegions(ctx, [{ x: ann.x, y: ann.y, width: ann.width, height: ann.height }], dpr);
        break;
      case 'arrow': {
        const from = { x: ann.from.x * dpr, y: ann.from.y * dpr };
        const to = { x: ann.to.x * dpr, y: ann.to.y * dpr };
        ctx.strokeStyle = '#ff453a';
        ctx.fillStyle = '#ff453a';
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const headLen = 10 * dpr;
        ctx.beginPath();
        ctx.moveTo(to.x, to.y);
        ctx.lineTo(to.x - headLen * Math.cos(angle - 0.4), to.y - headLen * Math.sin(angle - 0.4));
        ctx.lineTo(to.x - headLen * Math.cos(angle + 0.4), to.y - headLen * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'text':
        ctx.font = `${14 * dpr}px -apple-system, system-ui, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2 * dpr;
        ctx.strokeText(ann.text, ann.x * dpr, ann.y * dpr);
        ctx.fillText(ann.text, ann.x * dpr, ann.y * dpr);
        break;
    }
  }
}

export function openAnnotationEditor(
  sourceBlob: Blob,
  options: { autoBlurSensitive?: boolean; format?: ScreenshotFormat } = {}
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    const img = await loadImage(sourceBlob);
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.min(img.width / dpr, window.innerWidth - 80);
    const scale = displayWidth / (img.width / dpr);
    const displayHeight = (img.height / dpr) * scale;

    const overlay = document.createElement('div');
    overlay.setAttribute('data-ctrlweb-ui', 'annotation-editor');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 2147483647;
      background: rgba(0,0,0,0.85); display: flex; flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    `;

    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      display: flex; gap: 6px; padding: 10px 16px; background: #1a1a1f;
      border-bottom: 1px solid #2a2a32; flex-wrap: wrap; align-items: center;
    `;

    const tools: { id: AnnotationTool; label: string }[] = [
      { id: 'rectangle', label: '▢ Rect' },
      { id: 'arrow', label: '→ Arrow' },
      { id: 'highlight', label: '▬ Highlight' },
      { id: 'blur', label: '⊘ Blur' },
      { id: 'text', label: 'T Text' },
    ];

    let activeTool: AnnotationTool = 'rectangle';
    const annotations: Annotation[] = [];
    let drawing = false;
    let startPoint: Point | null = null;
    let tempEnd: Point | null = null;

    const canvasWrap = document.createElement('div');
    canvasWrap.style.cssText = 'flex:1; overflow:auto; display:flex; justify-content:center; padding:20px;';

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.style.cssText = `width:${displayWidth}px;height:${displayHeight}px;cursor:crosshair;border:1px solid #2a2a32;border-radius:4px;`;
    const ctx = canvas.getContext('2d')!;

    function redraw(): void {
      ctx.drawImage(img, 0, 0);
      if (options.autoBlurSensitive) {
        applyBlurRegions(ctx, detectSensitiveRects(), dpr);
      }
      renderAnnotations(ctx, annotations, dpr);

      if (drawing && startPoint && tempEnd && activeTool !== 'text') {
        ctx.save();
        if (activeTool === 'rectangle') {
          ctx.strokeStyle = '#007aff';
          ctx.lineWidth = 2 * dpr;
          const x = Math.min(startPoint.x, tempEnd.x);
          const y = Math.min(startPoint.y, tempEnd.y);
          const w = Math.abs(tempEnd.x - startPoint.x);
          const h = Math.abs(tempEnd.y - startPoint.y);
          ctx.strokeRect(x * dpr, y * dpr, w * dpr, h * dpr);
        } else if (activeTool === 'highlight' || activeTool === 'blur') {
          ctx.fillStyle = activeTool === 'highlight' ? 'rgba(255,214,10,0.35)' : 'rgba(128,128,128,0.3)';
          const x = Math.min(startPoint.x, tempEnd.x);
          const y = Math.min(startPoint.y, tempEnd.y);
          ctx.fillRect(x * dpr, y * dpr, Math.abs(tempEnd.x - startPoint.x) * dpr, Math.abs(tempEnd.y - startPoint.y) * dpr);
        } else if (activeTool === 'arrow') {
          ctx.strokeStyle = '#ff453a';
          ctx.lineWidth = 2 * dpr;
          ctx.beginPath();
          ctx.moveTo(startPoint.x * dpr, startPoint.y * dpr);
          ctx.lineTo(tempEnd.x * dpr, tempEnd.y * dpr);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    redraw();

    function canvasCoords(e: MouseEvent): Point {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / scale,
        y: (e.clientY - rect.top) / scale,
      };
    }

    tools.forEach(({ id, label }) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.cssText = `
        padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;
        background: ${activeTool === id ? '#007aff' : '#2a2a32'};
        color: #e8e8ed; border: 1px solid ${activeTool === id ? '#007aff' : '#3a3a44'};
      `;
      btn.addEventListener('click', () => {
        activeTool = id;
        tools.forEach((t) => {
          const b = toolbar.querySelector(`[data-tool="${t.id}"]`) as HTMLButtonElement;
          if (b) {
            b.style.background = t.id === id ? '#007aff' : '#2a2a32';
            b.style.borderColor = t.id === id ? '#007aff' : '#3a3a44';
          }
        });
      });
      btn.setAttribute('data-tool', id);
      toolbar.appendChild(btn);
    });

    const autoBlurLabel = document.createElement('label');
    autoBlurLabel.style.cssText = 'display:flex;align-items:center;gap:6px;color:#8b8b96;font-size:12px;margin-left:auto;cursor:pointer;';
    autoBlurLabel.innerHTML = `<input type="checkbox" id="auto-blur" ${options.autoBlurSensitive ? 'checked' : ''}> Auto-blur sensitive`;
    toolbar.appendChild(autoBlurLabel);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:6px;margin-left:8px;';
    actions.innerHTML = `
      <button id="undo" style="padding:6px 10px;background:#2a2a32;border:1px solid #3a3a44;color:#e8e8ed;border-radius:4px;cursor:pointer;font-size:12px;">Undo</button>
      <button id="done" style="padding:6px 10px;background:#30d158;border:none;color:white;border-radius:4px;cursor:pointer;font-size:12px;font-weight:500;">Done</button>
      <button id="cancel" style="padding:6px 10px;background:#2a2a32;border:1px solid #3a3a44;color:#e8e8ed;border-radius:4px;cursor:pointer;font-size:12px;">Cancel</button>
    `;
    toolbar.appendChild(actions);

    canvas.addEventListener('mousedown', (e) => {
      const pt = canvasCoords(e);
      if (activeTool === 'text') {
        const text = prompt('Enter text:');
        if (text) {
          annotations.push({ id: generateId(), tool: 'text', x: pt.x, y: pt.y, text });
          redraw();
        }
        return;
      }
      drawing = true;
      startPoint = pt;
      tempEnd = pt;
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!drawing) return;
      tempEnd = canvasCoords(e);
      redraw();
    });

    canvas.addEventListener('mouseup', (e) => {
      if (!drawing || !startPoint) return;
      drawing = false;
      const end = canvasCoords(e);
      const x = Math.min(startPoint.x, end.x);
      const y = Math.min(startPoint.y, end.y);
      const width = Math.abs(end.x - startPoint.x);
      const height = Math.abs(end.y - startPoint.y);

      if (activeTool === 'arrow') {
        if (Math.hypot(end.x - startPoint.x, end.y - startPoint.y) > 5) {
          annotations.push({ id: generateId(), tool: 'arrow', from: startPoint, to: end });
        }
      } else if (width > 3 && height > 3 && (activeTool === 'rectangle' || activeTool === 'highlight' || activeTool === 'blur')) {
        annotations.push({ id: generateId(), tool: activeTool, x, y, width, height });
      }

      startPoint = null;
      tempEnd = null;
      redraw();
    });

    autoBlurLabel.querySelector('input')?.addEventListener('change', (e) => {
      options.autoBlurSensitive = (e.target as HTMLInputElement).checked;
      redraw();
    });

    toolbar.querySelector('#undo')?.addEventListener('click', () => {
      annotations.pop();
      redraw();
    });

    toolbar.querySelector('#done')?.addEventListener('click', () => {
      redraw();
      canvas.toBlob((blob) => {
        overlay.remove();
        if (blob) resolve(blob);
        else reject(new Error('Export failed'));
      }, options.format === 'jpeg' ? 'image/jpeg' : 'image/png', 0.92);
    });

    toolbar.querySelector('#cancel')?.addEventListener('click', () => {
      overlay.remove();
      reject(new Error('Cancelled'));
    });

    canvasWrap.appendChild(canvas);
    overlay.appendChild(toolbar);
    overlay.appendChild(canvasWrap);
    document.body.appendChild(overlay);
  });
}
