import type { ExplanationResult } from '@/shared/types';

export function showExplainPanel(result: ExplanationResult): void {
  removePanel('explain-panel');

  const panel = createPanel('explain-panel');
  const sectionsHtml = result.sections
    .map((section) => {
      const content = Array.isArray(section.content)
        ? `<ul style="margin:4px 0;padding-left:16px;">${section.content.map((c) => `<li>${escapeHtml(c)}</li>`).join('')}</ul>`
        : `<p style="margin:4px 0;color:#c8c8d0;">${escapeHtml(section.content)}</p>`;
      return `
        <div style="margin-bottom:12px;">
          <div style="font-weight:600;font-size:12px;color:#8b8b96;margin-bottom:4px;">${escapeHtml(section.title)}</div>
          ${content}
        </div>
      `;
    })
    .join('');

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <span style="font-size:11px;color:#8b8b96;text-transform:uppercase;letter-spacing:0.05em;">🧠 Explain</span>
      <button data-close style="background:none;border:none;color:#8b8b96;cursor:pointer;font-size:18px;padding:0;line-height:1;">×</button>
    </div>
    <h2 style="font-size:18px;font-weight:600;margin:0 0 16px;color:#e8e8ed;">${escapeHtml(result.title)}</h2>
    ${sectionsHtml}
    <div style="font-size:11px;color:#5a5a64;margin-top:12px;">Source: ${result.source === 'local' ? 'Local knowledge base' : 'AI provider'}</div>
  `;

  bindClose(panel);
  document.body.appendChild(panel);
}

export function showPrivacyPanel(result: import('@/shared/types').PrivacyScanResult): void {
  removePanel('privacy-panel');

  const panel = createPanel('privacy-panel');
  const issuesHtml =
    result.issues.length === 0
      ? '<p style="color:#30d158;">No potentially sensitive information detected.</p>'
      : result.issues
          .map(
            (issue) => `
        <div style="margin-bottom:10px;padding:8px;background:#0d0d10;border-radius:6px;border-left:3px solid ${issue.severity === 'high' ? '#ff453a' : '#ff9f0a'};">
          <div style="font-size:12px;font-weight:500;color:#ff9f0a;">⚠ ${escapeHtml(issue.label)}</div>
          <div style="font-size:11px;color:#8b8b96;margin-top:2px;font-family:monospace;word-break:break-all;">${escapeHtml(truncateValue(issue.value))}</div>
        </div>
      `
          )
          .join('');

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <span style="font-size:11px;color:#8b8b96;text-transform:uppercase;letter-spacing:0.05em;">🔐 Privacy Check</span>
      <button data-close style="background:none;border:none;color:#8b8b96;cursor:pointer;font-size:18px;padding:0;line-height:1;">×</button>
    </div>
    <div style="font-size:14px;font-weight:600;margin-bottom:12px;">
      ${result.issues.length} potential issue${result.issues.length !== 1 ? 's' : ''} found
    </div>
    ${issuesHtml}
    ${
      result.issues.length
        ? `<div style="display:flex;gap:8px;margin-top:16px;">
        <button data-redact style="flex:1;background:#ff453a;border:none;color:white;padding:8px;border-radius:6px;cursor:pointer;font-size:12px;">Redact detected values</button>
        <button data-copy-safe style="flex:1;background:#2a2a32;border:1px solid #3a3a44;color:#e8e8ed;padding:8px;border-radius:6px;cursor:pointer;font-size:12px;">Copy safe version</button>
      </div>`
        : ''
    }
  `;

  bindClose(panel);

  panel.querySelector('[data-redact]')?.addEventListener('click', async () => {
    const { redactText } = await import('@/features/privacy/privacyScanner');
    const redacted = redactText(result.text, result.issues);
    await navigator.clipboard.writeText(redacted);
    const { showToast } = await import('./toast');
    showToast('✓ Redacted text copied');
    panel.remove();
  });

  panel.querySelector('[data-copy-safe]')?.addEventListener('click', async () => {
    const { copySafeVersion } = await import('@/features/privacy/privacyScanner');
    await copySafeVersion(result.issues, result.text);
    const { showToast } = await import('./toast');
    showToast('✓ Safe version copied');
  });

  document.body.appendChild(panel);
}

export function showCleanLinkPanel(result: import('@/shared/types').CleanLinkResult): void {
  removePanel('cleanlink-panel');

  const panel = createPanel('cleanlink-panel');
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <span style="font-size:11px;color:#8b8b96;text-transform:uppercase;letter-spacing:0.05em;">🔗 Clean Link</span>
      <button data-close style="background:none;border:none;color:#8b8b96;cursor:pointer;font-size:18px;padding:0;line-height:1;">×</button>
    </div>
    <div style="margin-bottom:12px;">
      <div style="font-size:11px;color:#8b8b96;margin-bottom:4px;">Original</div>
      <div style="font-size:12px;font-family:monospace;word-break:break-all;color:#8b8b96;background:#0d0d10;padding:8px;border-radius:4px;">${escapeHtml(result.original)}</div>
    </div>
    <div style="margin-bottom:16px;">
      <div style="font-size:11px;color:#8b8b96;margin-bottom:4px;">Clean</div>
      <div style="font-size:12px;font-family:monospace;word-break:break-all;color:#30d158;background:#0d0d10;padding:8px;border-radius:4px;">${escapeHtml(result.cleaned)}</div>
    </div>
    ${result.removedParams.length ? `<div style="font-size:11px;color:#5a5a64;margin-bottom:12px;">Removed: ${result.removedParams.join(', ')}</div>` : ''}
    <div style="display:flex;flex-wrap:wrap;gap:6px;">
      <button data-copy-url style="background:#007aff;border:none;color:white;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;">Copy clean URL</button>
      <button data-copy-md style="background:#2a2a32;border:1px solid #3a3a44;color:#e8e8ed;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;">Copy Markdown</button>
      <button data-copy-html style="background:#2a2a32;border:1px solid #3a3a44;color:#e8e8ed;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;">Copy HTML</button>
    </div>
  `;

  bindClose(panel);
  panel.querySelector('[data-copy-url]')?.addEventListener('click', () => navigator.clipboard.writeText(result.cleaned));
  panel.querySelector('[data-copy-md]')?.addEventListener('click', () => navigator.clipboard.writeText(`[Link](${result.cleaned})`));
  panel.querySelector('[data-copy-html]')?.addEventListener('click', () => navigator.clipboard.writeText(`<a href="${result.cleaned}">${result.cleaned}</a>`));

  document.body.appendChild(panel);
}

export function showSummarizePanel(result: import('@/shared/types').SummarizeResult): void {
  removePanel('summarize-panel');

  const panel = createPanel('summarize-panel');
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <span style="font-size:11px;color:#8b8b96;text-transform:uppercase;letter-spacing:0.05em;">📝 Summarize</span>
      <button data-close style="background:none;border:none;color:#8b8b96;cursor:pointer;font-size:18px;padding:0;line-height:1;">×</button>
    </div>
    <div style="font-size:11px;color:#5a5a64;margin-bottom:12px;">${result.wordCount} words · ${result.readingTime} · ${result.source === 'local' ? 'Local extraction' : 'AI'}</div>
    <p style="font-size:14px;line-height:1.6;color:#c8c8d0;margin:0 0 12px;">${escapeHtml(result.summary)}</p>
    ${
      result.headings?.length
        ? `<div style="font-size:12px;color:#8b8b96;"><strong>Sections:</strong><ul style="margin:4px 0;padding-left:16px;">${result.headings.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}</ul></div>`
        : ''
    }
    <button data-copy style="margin-top:12px;background:#2a2a32;border:1px solid #3a3a44;color:#e8e8ed;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;">Copy summary</button>
  `;

  bindClose(panel);
  panel.querySelector('[data-copy]')?.addEventListener('click', () => navigator.clipboard.writeText(result.summary));
  document.body.appendChild(panel);
}

export function showSavePanel(onSave: (notes: string, tags: string) => void): void {
  removePanel('save-panel');

  const panel = createPanel('save-panel');
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <span style="font-size:11px;color:#8b8b96;text-transform:uppercase;letter-spacing:0.05em;">💾 Save locally</span>
      <button data-close style="background:none;border:none;color:#8b8b96;cursor:pointer;font-size:18px;padding:0;line-height:1;">×</button>
    </div>
    <label style="display:block;font-size:12px;color:#8b8b96;margin-bottom:4px;">Notes</label>
    <textarea id="notes" style="width:100%;height:60px;background:#0d0d10;border:1px solid #2a2a32;color:#e8e8ed;padding:8px;border-radius:4px;font-family:inherit;font-size:13px;resize:vertical;box-sizing:border-box;" placeholder="Add notes..."></textarea>
    <label style="display:block;font-size:12px;color:#8b8b96;margin:8px 0 4px;">Tags (comma-separated)</label>
    <input id="tags" type="text" style="width:100%;background:#0d0d10;border:1px solid #2a2a32;color:#e8e8ed;padding:8px;border-radius:4px;font-family:inherit;font-size:13px;box-sizing:border-box;" placeholder="research, work, ...">
    <button data-save style="margin-top:12px;width:100%;background:#007aff;border:none;color:white;padding:8px;border-radius:6px;cursor:pointer;font-weight:500;">Save to library</button>
  `;

  bindClose(panel);
  panel.querySelector('[data-save]')?.addEventListener('click', () => {
    const notes = (panel.querySelector('#notes') as HTMLTextAreaElement).value;
    const tags = (panel.querySelector('#tags') as HTMLInputElement).value;
    onSave(notes, tags);
    panel.remove();
  });

  document.body.appendChild(panel);
}

function createPanel(id: string): HTMLElement {
  const panel = document.createElement('div');
  panel.setAttribute('data-ctrlweb-ui', id);
  panel.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #1a1a1f;
    border: 1px solid #2a2a32;
    border-radius: 12px;
    padding: 20px;
    z-index: 2147483646;
    width: min(420px, 90vw);
    max-height: 80vh;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    color: #e8e8ed;
    box-shadow: 0 16px 48px rgba(0,0,0,0.5);
  `;
  return panel;
}

function bindClose(panel: HTMLElement): void {
  panel.querySelector('[data-close]')?.addEventListener('click', () => panel.remove());
}

function removePanel(id: string): void {
  document.querySelector(`[data-ctrlweb-ui="${id}"]`)?.remove();
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncateValue(value: string): string {
  return value.length > 60 ? value.slice(0, 57) + '...' : value;
}

export function removeAllPanels(): void {
  document.querySelectorAll('[data-ctrlweb-ui]').forEach((el) => {
    if (!el.getAttribute('data-ctrlweb-ui')?.includes('control-bar') && !el.getAttribute('data-ctrlweb-ui')?.includes('toast')) {
      el.remove();
    }
  });
}
