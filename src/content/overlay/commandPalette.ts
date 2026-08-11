import { PALETTE_FEATURE_IDS } from '@/shared/constants';
import { REGISTRY_BY_ID, SUITE_FEATURES, UTILITY_FEATURES } from '@/core/registry/featureRegistry';
import type { FeatureId } from '@/shared/types';
import { fuzzyMatch } from '@/shared/utils';

let paletteEl: HTMLElement | null = null;
let selectedIndex = 0;
let filteredIds: FeatureId[] = PALETTE_FEATURE_IDS;

export function showCommandPalette(onSelect: (id: FeatureId) => void): void {
  hideCommandPalette();

  paletteEl = document.createElement('div');
  paletteEl.setAttribute('data-ctrlweb-ui', 'command-palette');
  paletteEl.setAttribute('role', 'dialog');
  paletteEl.setAttribute('aria-label', 'CTRL+WEB command palette');

  paletteEl.innerHTML = `
    <div style="
      position: fixed; inset: 0; z-index: 2147483647;
      background: rgba(0,0,0,0.5); display: flex;
      align-items: flex-start; justify-content: center; padding-top: 12vh;
    ">
      <div style="
        width: min(520px, 92vw); background: #1a1a1f;
        border: 1px solid #2a2a32; border-radius: 14px;
        box-shadow: 0 16px 48px rgba(0,0,0,0.5); overflow: hidden;
      ">
        <div style="padding: 14px 16px; border-bottom: 1px solid #2a2a32;">
          <input
            id="ctrlweb-palette-input"
            type="text"
            placeholder="🔎 What do you want to do?"
            autocomplete="off"
            style="
              width: 100%; background: transparent; border: none;
              color: #e8e8ed; font-size: 15px; font-family: inherit;
              outline: none; box-sizing: border-box;
            "
            aria-label="Search commands"
          />
          <p style="margin:8px 0 0;font-size:12px;color:#8b8b96">Search your browsing memory · ↑↓ Enter Esc</p>
        </div>
        <div style="padding:6px 8px 4px;font-size:11px;color:#5a5a64;text-transform:uppercase;letter-spacing:0.06em">All features · suite + utilities</div>
        <ul id="ctrlweb-palette-list" role="listbox" style="
          list-style: none; margin: 0; padding: 4px 4px 8px;
          max-height: 380px; overflow-y: auto;
        "></ul>
      </div>
    </div>
  `;

  document.body.appendChild(paletteEl);

  const input = paletteEl.querySelector('#ctrlweb-palette-input') as HTMLInputElement;
  const list = paletteEl.querySelector('#ctrlweb-palette-list') as HTMLUListElement;

  function getMeta(id: FeatureId) {
    return REGISTRY_BY_ID[id] ?? {
      icon: '⚡',
      name: id,
      description: '',
      keywords: [],
    };
  }

  function renderList(query = ''): void {
    filteredIds = PALETTE_FEATURE_IDS.map((id) => {
      const meta = getMeta(id);
      const score = Math.max(
        fuzzyMatch(query, meta.name),
        fuzzyMatch(query, meta.description),
        ...(meta.keywords ?? []).map((k) => fuzzyMatch(query, k))
      );
      return { id, score };
    })
      .filter(({ score }) => !query || score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ id }) => id);

    if (!filteredIds.length) filteredIds = PALETTE_FEATURE_IDS;
    selectedIndex = 0;

    list.innerHTML = filteredIds
      .map((id, i) => {
        const meta = getMeta(id);
        return `<li role="option" data-id="${id}" aria-selected="${i === 0}" style="
          padding: 10px 14px; cursor: pointer; border-radius: 8px;
          display: flex; align-items: flex-start; gap: 10px;
          background: ${i === 0 ? '#2a2a32' : 'transparent'};
          color: #e8e8ed; font-size: 14px;
        ">
          <span style="font-size:18px;line-height:1">${meta.icon}</span>
          <span>
            <span style="display:block;font-weight:600">${meta.name}</span>
            <span style="display:block;font-size:12px;color:#8b8b96;margin-top:2px">${meta.description}</span>
          </span>
        </li>`;
      })
      .join('');

    list.querySelectorAll('li').forEach((li, i) => {
      li.addEventListener('mouseenter', () => {
        selectedIndex = i;
        updateSelection(list);
      });
      li.addEventListener('click', () => {
        onSelect(filteredIds[i]);
        hideCommandPalette();
      });
    });
  }

  input.addEventListener('input', () => renderList(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, filteredIds.length - 1);
      updateSelection(list);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      updateSelection(list);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onSelect(filteredIds[selectedIndex]);
      hideCommandPalette();
    } else if (e.key === 'Escape') {
      hideCommandPalette();
    }
  });

  paletteEl.querySelector('div')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideCommandPalette();
  });

  renderList();
  input.focus();
}

function updateSelection(list: HTMLElement): void {
  list.querySelectorAll('li').forEach((li, i) => {
    (li as HTMLElement).style.background = i === selectedIndex ? '#2a2a32' : 'transparent';
    li.setAttribute('aria-selected', String(i === selectedIndex));
  });
}

export function hideCommandPalette(): void {
  paletteEl?.remove();
  paletteEl = null;
}

export function isPaletteOpen(): boolean {
  return paletteEl !== null;
}

export { SUITE_FEATURES, UTILITY_FEATURES };
