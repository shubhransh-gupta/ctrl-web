import type { InspectElementData } from '@/shared/types';
import { getCssSelector, getXPath } from '@/shared/utils';

export function inspectElement(el: Element): InspectElementData {
  const htmlEl = el as HTMLElement;
  const rect = htmlEl.getBoundingClientRect();
  const computed = window.getComputedStyle(htmlEl);

  const colors: InspectElementData['colors'] = [];
  ['color', 'background-color', 'border-color'].forEach((prop) => {
    const value = computed.getPropertyValue(prop);
    if (value && value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') {
      colors.push({ property: prop, value });
    }
  });

  const spacing: InspectElementData['spacing'] = [];
  ['padding', 'margin', 'gap'].forEach((prop) => {
    const value = computed.getPropertyValue(prop);
    if (value && value !== '0px') {
      spacing.push({ property: prop, value });
    }
  });

  const relevantProps = [
    'display', 'position', 'width', 'height', 'font-size', 'font-weight',
    'font-family', 'line-height', 'color', 'background-color', 'border',
    'border-radius', 'padding', 'margin', 'flex', 'grid', 'opacity', 'z-index',
  ];

  const cssLines = relevantProps
    .map((prop) => {
      const val = computed.getPropertyValue(prop);
      return val ? `  ${prop}: ${val};` : null;
    })
    .filter(Boolean);

  return {
    tagName: htmlEl.tagName.toLowerCase(),
    selector: getCssSelector(htmlEl),
    xpath: getXPath(htmlEl),
    dimensions: { width: Math.round(rect.width), height: Math.round(rect.height) },
    typography: {
      fontSize: computed.fontSize,
      lineHeight: computed.lineHeight,
      fontFamily: computed.fontFamily.split(',')[0].trim(),
      fontWeight: computed.fontWeight,
    },
    colors,
    spacing,
    cssText: `${htmlEl.tagName.toLowerCase()} {\n${cssLines.join('\n')}\n}`,
    html: htmlEl.outerHTML.slice(0, 2000),
  };
}

let inspectMode = false;
let highlight: HTMLElement | null = null;
let infoPanel: HTMLElement | null = null;

function createHighlight(): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-ctrlweb-ui', 'inspect-highlight');
  el.style.cssText = `
    position: fixed;
    pointer-events: none;
    border: 2px solid #007aff;
    background: rgba(0, 122, 255, 0.08);
    z-index: 2147483645;
    transition: all 0.1s ease;
  `;
  return el;
}

function createInfoPanel(): HTMLElement {
  const el = document.createElement('div');
  el.setAttribute('data-ctrlweb-ui', 'inspect-panel');
  el.style.cssText = `
    position: fixed;
    top: 16px;
    right: 16px;
    width: 320px;
    max-height: 80vh;
    overflow-y: auto;
    background: #1a1a1f;
    border: 1px solid #2a2a32;
    border-radius: 8px;
    padding: 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, monospace;
    font-size: 12px;
    color: #e8e8ed;
    z-index: 2147483646;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
  `;
  return el;
}

function renderPanel(data: InspectElementData): void {
  if (!infoPanel) return;
  infoPanel.innerHTML = `
    <div style="font-weight:700;font-size:11px;color:#8b8b96;margin-bottom:8px;">ELEMENT</div>
    <div style="font-size:14px;font-weight:600;margin-bottom:12px;color:#007aff;">${data.selector}</div>
    <div style="margin-bottom:8px;"><span style="color:#8b8b96;">Dimensions</span><br>${data.dimensions.width} × ${data.dimensions.height}</div>
    <div style="margin-bottom:8px;"><span style="color:#8b8b96;">Typography</span><br>${data.typography.fontSize} / ${data.typography.lineHeight}<br>${data.typography.fontFamily}</div>
    ${data.colors.length ? `<div style="margin-bottom:8px;"><span style="color:#8b8b96;">Colors</span><br>${data.colors.map(c => c.value).join('<br>')}</div>` : ''}
    ${data.spacing.length ? `<div style="margin-bottom:8px;"><span style="color:#8b8b96;">Spacing</span><br>${data.spacing.map(s => `${s.property}: ${s.value}`).join('<br>')}</div>` : ''}
    <div style="margin-bottom:12px;"><span style="color:#8b8b96;">CSS</span><br><pre style="background:#0d0d10;padding:8px;border-radius:4px;overflow-x:auto;margin-top:4px;font-size:11px;">${data.cssText.replace(/</g, '&lt;')}</pre></div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;">
      <button data-copy="html" style="background:#2a2a32;border:1px solid #3a3a44;color:#e8e8ed;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;">Copy HTML</button>
      <button data-copy="css" style="background:#2a2a32;border:1px solid #3a3a44;color:#e8e8ed;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;">Copy CSS</button>
      <button data-copy="selector" style="background:#2a2a32;border:1px solid #3a3a44;color:#e8e8ed;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;">Copy selector</button>
      <button data-copy="xpath" style="background:#2a2a32;border:1px solid #3a3a44;color:#e8e8ed;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;">Copy XPath</button>
      <button data-action="exit" style="background:#007aff;border:none;color:white;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;margin-left:auto;">Exit</button>
    </div>
  `;

  infoPanel.querySelector('[data-copy="html"]')?.addEventListener('click', () => navigator.clipboard.writeText(data.html));
  infoPanel.querySelector('[data-copy="css"]')?.addEventListener('click', () => navigator.clipboard.writeText(data.cssText));
  infoPanel.querySelector('[data-copy="selector"]')?.addEventListener('click', () => navigator.clipboard.writeText(data.selector));
  infoPanel.querySelector('[data-copy="xpath"]')?.addEventListener('click', () => navigator.clipboard.writeText(data.xpath));
  infoPanel.querySelector('[data-action="exit"]')?.addEventListener('click', stopInspectMode);
}

function onMouseMove(e: MouseEvent): void {
  if (!inspectMode) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || el.closest('[data-ctrlweb-ui]')) return;
  const rect = el.getBoundingClientRect();
  if (highlight) {
    highlight.style.top = `${rect.top}px`;
    highlight.style.left = `${rect.left}px`;
    highlight.style.width = `${rect.width}px`;
    highlight.style.height = `${rect.height}px`;
  }
}

function onClick(e: MouseEvent): void {
  if (!inspectMode) return;
  e.preventDefault();
  e.stopPropagation();
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || el.closest('[data-ctrlweb-ui]')) return;
  const data = inspectElement(el);
  renderPanel(data);
}

export function startInspectMode(): void {
  if (inspectMode) return;
  inspectMode = true;
  highlight = createHighlight();
  infoPanel = createInfoPanel();
  infoPanel.innerHTML = '<div style="color:#8b8b96;">Click an element to inspect</div>';
  document.body.appendChild(highlight);
  document.body.appendChild(infoPanel);
  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);
  document.body.style.cursor = 'crosshair';
}

export function stopInspectMode(): void {
  inspectMode = false;
  highlight?.remove();
  infoPanel?.remove();
  highlight = null;
  infoPanel = null;
  document.removeEventListener('mousemove', onMouseMove, true);
  document.removeEventListener('click', onClick, true);
  document.body.style.cursor = '';
}

export function isInspectActive(): boolean {
  return inspectMode;
}
