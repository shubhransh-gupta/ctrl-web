import { escapeHtml, formatRelativeTime } from '@/shared/utils';
import type {
  BacktrackTimeline,
  ClipboardMemory,
  DeadlineItem,
  FindItSearchResult,
  TabContextRecord,
  TabGroup,
  Workspace,
} from '@/shared/types';
import { formatVisitTime } from '@/features/backtrack/backtrackService';
import { formatRelativeOpened } from '@/features/context/contextService';
import { formatClipboardPreview } from '@/features/copypaste/copypasteService';
import { formatDeadlineDate } from '@/features/deadline/deadlineService';
import { formatWorkspaceDate } from '@/features/tabzero/tabzeroService';
import { removeAllPanels } from './panels';

const PANEL_STYLE = `
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  z-index: 2147483646; width: min(520px, 92vw); max-height: 80vh;
  background: #1a1a1f; border: 1px solid #2a2a32; border-radius: 14px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.55); overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  color: #e8e8ed;
`;

function mountPanel(title: string, bodyHtml: string, onClose?: () => void): HTMLElement {
  removeAllPanels();
  removeSuitePanels();

  const overlay = document.createElement('div');
  overlay.setAttribute('data-ctrlweb-ui', 'suite-panel');
  overlay.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:2147483645" data-close></div>
    <div style="${PANEL_STYLE}">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #2a2a32">
        <strong style="font-size:15px">${escapeHtml(title)}</strong>
        <button data-close style="background:none;border:none;color:#8b8b96;font-size:18px;cursor:pointer">×</button>
      </div>
      <div style="padding:16px 18px;overflow-y:auto;max-height:calc(80vh - 56px)">${bodyHtml}</div>
    </div>
  `;

  overlay.querySelectorAll('[data-close]').forEach((el) => {
    el.addEventListener('click', () => {
      overlay.remove();
      onClose?.();
    });
  });

  document.body.appendChild(overlay);
  return overlay;
}

export function removeSuitePanels(): void {
  document.querySelectorAll('[data-ctrlweb-ui="suite-panel"]').forEach((el) => el.remove());
}

async function sendMessage<T>(type: string, payload?: unknown): Promise<T | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError || !response?.success) resolve(null);
      else resolve(response.data as T);
    });
  });
}

export function showFindItPanel(initialQuery = ''): void {
  const overlay = mountPanel('🔎 FindIT', `
    <input id="cw-findit-q" type="text" placeholder="Search your browsing memory…" value="${escapeHtml(initialQuery)}"
      style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid #2a2a32;background:#0d0d10;color:#e8e8ed;font-size:14px;margin-bottom:12px" />
    <p style="font-size:12px;color:#8b8b96;margin-bottom:12px">Try: <code>site:github.com last week</code></p>
    <div id="cw-findit-results"></div>
  `);

  const input = overlay.querySelector('#cw-findit-q') as HTMLInputElement;
  const results = overlay.querySelector('#cw-findit-results') as HTMLElement;

  async function search(): Promise<void> {
    const data = await sendMessage<FindItSearchResult[]>('FINDIT_SEARCH', { query: input.value });
    if (!data?.length) {
      results.innerHTML = '<p style="color:#8b8b96;font-size:13px">No matches found.</p>';
      return;
    }
    results.innerHTML = data
      .slice(0, 20)
      .map(
        (r) => `
      <div style="padding:12px;border:1px solid #2a2a32;border-radius:8px;margin-bottom:8px;cursor:pointer" data-url="${escapeHtml(r.page.url)}">
        <div style="font-weight:600;font-size:14px;margin-bottom:4px">${escapeHtml(r.page.title)}</div>
        <div style="font-size:12px;color:#007aff;margin-bottom:6px">${escapeHtml(r.page.domain)}</div>
        <div style="font-size:12px;color:#8b8b96;line-height:1.5">${escapeHtml(r.snippet)}</div>
        <div style="font-size:11px;color:#5a5a64;margin-top:6px">${formatRelativeTime(r.page.lastVisited)}${r.page.pinned ? ' · pinned' : ''}</div>
      </div>`
      )
      .join('');

    results.querySelectorAll('[data-url]').forEach((el) => {
      el.addEventListener('click', () => {
        window.open((el as HTMLElement).dataset.url, '_blank');
      });
    });
  }

  input.addEventListener('input', () => search());
  search();
  input.focus();
}

export function showBacktrackPanel(): void {
  mountPanel('🧠 Backtrack', `
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px" id="cw-bt-ranges"></div>
    <div id="cw-bt-body"><p style="color:#8b8b96">Loading…</p></div>
  `);

  const ranges = ['10m', '30m', '1h', 'today', 'yesterday'];
  const rangeEl = document.querySelector('#cw-bt-ranges')!;
  const body = document.querySelector('#cw-bt-body')!;

  async function load(range: string): Promise<void> {
    const data = await sendMessage<BacktrackTimeline>('BACKTRACK_GET', { range });
    if (!data) {
      body.innerHTML = '<p style="color:#8b8b96">No activity recorded.</p>';
      return;
    }
    body.innerHTML = `
      <div style="background:#24242c;border-radius:8px;padding:12px;margin-bottom:14px">
        <div style="font-size:12px;color:#8b8b96;margin-bottom:4px">Likely activity</div>
        <div style="font-weight:600">${escapeHtml(data.activityLabel)}</div>
      </div>
      <div style="font-size:12px;color:#8b8b96;margin-bottom:8px">${escapeHtml(data.rangeLabel)}</div>
      ${data.visits
        .slice(-30)
        .reverse()
        .map(
          (v) => `
        <div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #2a2a32">
          <span style="color:#8b8b96;font-size:12px;min-width:48px">${formatVisitTime(v.timestamp)}</span>
          <div>
            <div style="font-size:13px;font-weight:500">${escapeHtml(v.domain)}</div>
            <div style="font-size:12px;color:#8b8b96">${escapeHtml(v.title)}</div>
          </div>
        </div>`
        )
        .join('') || '<p style="color:#8b8b96">No visits in this range.</p>'}
    `;
  }

  ranges.forEach((r, i) => {
    const btn = document.createElement('button');
    btn.textContent = r === '10m' ? '10 min' : r === '30m' ? '30 min' : r === '1h' ? '1 hour' : r;
    btn.style.cssText = `padding:6px 10px;border-radius:6px;border:1px solid #2a2a32;background:${i === 1 ? '#2a2a32' : '#0d0d10'};color:#e8e8ed;font-size:12px;cursor:pointer`;
    btn.addEventListener('click', () => {
      rangeEl.querySelectorAll('button').forEach((b) => ((b as HTMLElement).style.background = '#0d0d10'));
      btn.style.background = '#2a2a32';
      load(r);
    });
    rangeEl.appendChild(btn);
  });

  load('30m');
}

export function showContextPanel(): void {
  mountPanel('🧩 Context', '<div id="cw-ctx-body"><p style="color:#8b8b96">Loading…</p></div>');

  sendMessage<TabContextRecord>('CONTEXT_GET').then((data) => {
    const body = document.querySelector('#cw-ctx-body')!;
    if (!data) {
      body.innerHTML = '<p style="color:#8b8b96">No context available for this tab yet.</p>';
      return;
    }
    body.innerHTML = `
      <p style="font-size:14px;margin-bottom:14px">You probably opened this while researching:</p>
      <div style="background:#24242c;border-radius:8px;padding:14px;margin-bottom:16px;font-weight:600">${escapeHtml(data.topic)}</div>
      <div style="font-size:12px;color:#8b8b96;margin-bottom:8px">Related pages</div>
      ${data.relatedPages
        .map(
          (p) => `
        <div style="padding:8px 0;border-bottom:1px solid #2a2a32;font-size:13px">
          <a href="${escapeHtml(p.url)}" target="_blank" rel="noopener" style="color:#007aff;text-decoration:none">${escapeHtml(p.title)}</a>
        </div>`
        )
        .join('') || '<p style="color:#8b8b96;font-size:13px">No related pages found.</p>'}
      <p style="font-size:12px;color:#5a5a64;margin-top:14px">Opened ${formatRelativeOpened(data.openedAt)}</p>
    `;
  });
}

export function showTabZeroPanel(): void {
  mountPanel('🗂️ TabZero', '<div id="cw-tz-body"><p style="color:#8b8b96">Loading tabs…</p></div>');

  sendMessage<{ groups: TabGroup[]; total: number }>('TABZERO_GET').then((data) => {
    const body = document.querySelector('#cw-tz-body')!;
    if (!data?.groups.length) {
      body.innerHTML = '<p style="color:#8b8b96">No tabs to organize.</p>';
      return;
    }
    body.innerHTML = `
      <p style="font-size:14px;margin-bottom:14px"><strong>${data.total}</strong> tabs</p>
      ${data.groups
        .map(
          (g) => `
        <div style="border:1px solid #2a2a32;border-radius:8px;padding:12px;margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <strong>${g.icon} ${escapeHtml(g.label)}</strong>
            <span style="font-size:12px;color:#8b8b96">${g.tabs.length} tabs</span>
          </div>
          <div style="display:flex;gap:8px">
            <button data-save="${g.id}" style="flex:1;padding:8px;border-radius:6px;border:1px solid #2a2a32;background:#24242c;color:#e8e8ed;cursor:pointer;font-size:12px">Save workspace</button>
            <button data-close-group="${g.id}" style="flex:1;padding:8px;border-radius:6px;border:1px solid #2a2a32;background:#24242c;color:#e8e8ed;cursor:pointer;font-size:12px">Close tabs</button>
          </div>
        </div>`
        )
        .join('')}
      <div id="cw-tz-workspaces" style="margin-top:16px"></div>
    `;

    body.querySelectorAll('[data-save]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const groupId = (btn as HTMLElement).dataset.save!;
        await sendMessage('TABZERO_SAVE', { groupId });
        loadWorkspaces();
      });
    });

    body.querySelectorAll('[data-close-group]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const groupId = (btn as HTMLElement).dataset.closeGroup!;
        await sendMessage('TABZERO_CLOSE', { groupId });
        showTabZeroPanel();
      });
    });

    loadWorkspaces();
  });

  async function loadWorkspaces(): Promise<void> {
    const workspaces = await sendMessage<Workspace[]>('TABZERO_GET', { workspaces: true });
    const el = document.querySelector('#cw-tz-workspaces');
    if (!el || !workspaces?.length) return;
    el.innerHTML = `
      <div style="font-size:12px;color:#8b8b96;margin-bottom:8px">Saved workspaces</div>
      ${workspaces
        .slice(0, 5)
        .map(
          (w) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border:1px solid #2a2a32;border-radius:8px;margin-bottom:6px">
          <div>
            <div style="font-size:13px;font-weight:500">${escapeHtml(w.name)}</div>
            <div style="font-size:11px;color:#8b8b96">${w.tabs.length} tabs · ${formatWorkspaceDate(w.createdAt)}</div>
          </div>
          <button data-resume="${w.id}" style="padding:6px 10px;border-radius:6px;border:1px solid #2a2a32;background:#007aff;color:white;cursor:pointer;font-size:12px">Resume</button>
        </div>`
        )
        .join('')}
    `;
    el.querySelectorAll('[data-resume]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await sendMessage('TABZERO_RESUME', { id: (btn as HTMLElement).dataset.resume });
      });
    });
  }
}

export function showCopyPastePanel(): void {
  mountPanel('📋 CopyPaste', `
    <input id="cw-cp-q" type="text" placeholder="Search clipboard…" style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid #2a2a32;background:#0d0d10;color:#e8e8ed;font-size:14px;margin-bottom:12px" />
    <div id="cw-cp-list"><p style="color:#8b8b96">Loading…</p></div>
    <button id="cw-cp-clear" style="margin-top:12px;padding:8px 12px;border-radius:6px;border:1px solid #2a2a32;background:#24242c;color:#e8e8ed;cursor:pointer;font-size:12px">Clear history</button>
  `);

  const input = document.querySelector('#cw-cp-q') as HTMLInputElement;
  const list = document.querySelector('#cw-cp-list')!;

  async function load(): Promise<void> {
    const items = await sendMessage<ClipboardMemory[]>('COPYPASTE_GET', { query: input.value });
    if (!items?.length) {
      list.innerHTML = '<p style="color:#8b8b96;font-size:13px">No clipboard history yet. Use Save selected text or Copy with source.</p>';
      return;
    }
    list.innerHTML = items
      .map(
        (item) => `
      <div style="padding:12px;border:1px solid #2a2a32;border-radius:8px;margin-bottom:8px">
        <div style="font-size:13px;margin-bottom:6px;line-height:1.5">"${escapeHtml(formatClipboardPreview(item.text))}"</div>
        <div style="font-size:11px;color:#007aff">${escapeHtml(item.sourceUrl ? new URL(item.sourceUrl).hostname : 'Unknown')}</div>
        <div style="font-size:11px;color:#5a5a64;margin-top:4px">${formatRelativeTime(item.timestamp)}</div>
      </div>`
      )
      .join('');
  }

  input.addEventListener('input', load);
  document.querySelector('#cw-cp-clear')?.addEventListener('click', async () => {
    await sendMessage('COPYPASTE_CLEAR');
    load();
  });
  load();
}

export function showDeadlinePanel(deadlines: DeadlineItem[]): void {
  mountPanel(
    '📅 Deadlines',
    deadlines.length
      ? deadlines
          .map(
            (d) => `
        <div style="padding:14px;border:1px solid #2a2a32;border-radius:8px;margin-bottom:10px">
          <div style="font-weight:600;margin-bottom:6px">${escapeHtml(d.label)}</div>
          <div style="font-size:14px;color:#007aff;margin-bottom:8px">${formatDeadlineDate(d.date)}</div>
          <div style="font-size:11px;color:#8b8b96">Source: ${escapeHtml(new URL(d.sourceUrl).hostname)}</div>
          <button data-remind="${d.id}" style="margin-top:10px;padding:6px 10px;border-radius:6px;border:1px solid #2a2a32;background:#24242c;color:#e8e8ed;cursor:pointer;font-size:12px">Create reminder</button>
        </div>`
          )
          .join('')
      : '<p style="color:#8b8b96">No deadlines detected on this page.</p>'
  );

  document.querySelectorAll('[data-remind]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.remind!;
      await sendMessage('DEADLINE_SAVE', { id });
      (btn as HTMLButtonElement).textContent = 'Reminder saved';
    });
  });
}

export function showDeadlineBadge(count: number, onClick: () => void): void {
  document.querySelector('[data-ctrlweb-deadline-badge]')?.remove();
  if (count <= 0) return;

  const badge = document.createElement('button');
  badge.setAttribute('data-ctrlweb-deadline-badge', 'true');
  badge.textContent = `📅 ${count} deadline${count === 1 ? '' : 's'} detected`;
  badge.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 2147483640;
    padding: 10px 14px; border-radius: 100px; border: 1px solid #2a2a32;
    background: #1a1a1f; color: #e8e8ed; font-size: 13px; cursor: pointer;
    box-shadow: 0 8px 24px rgba(0,0,0,0.35); font-family: inherit;
  `;
  badge.addEventListener('click', onClick);
  document.body.appendChild(badge);
}
