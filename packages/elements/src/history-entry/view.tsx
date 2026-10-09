/** The default look: a dot on the timeline's rule, the title and date, then meta, words and scopes. */
import { Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { HistoryEntryLogic } from './logic.js';

const TONE = { warn: 'var(--idp-warn)', info: 'var(--idp-info)', ok: 'var(--idp-ok)', muted: 'var(--idp-muted)' } as const;

export const historyEntryView = (h: HistoryEntryLogic) => (
  <div part="history-entry" class="entry" style={() => `--tone: ${TONE[h.tone()]}`}>
    <style scoped>{`
      .entry { display: grid; grid-template-columns: 16px minmax(0, 1fr) auto; gap: 2px 14px; padding-bottom: 18px; position: relative; }
      .entry::before { content: ''; position: absolute; left: 7px; top: 16px; bottom: 0; width: 1px; background: var(--idp-border); }
      .dot { width: 10px; height: 10px; margin: 5px 3px; border-radius: 50%; background: var(--tone); box-shadow: 0 0 0 3px color-mix(in srgb, var(--tone) 20%, transparent); position: relative; }
      .title { font-weight: 600; }
      .date { color: var(--idp-muted); font-size: 13px; }
      .meta, .text, .scopes { grid-column: 2 / -1; }
      .meta { color: var(--idp-muted); font-size: 12.5px; }
      .text { margin-top: 4px; }
      .scopes { font-family: var(--idp-mono); font-size: 12px; color: var(--idp-muted); }
    `}</style>
    <span class="dot" aria-hidden="true" />
    <span class="title">{() => h.title()}</span>
    <span class="date">{() => h.date()}</span>
    <span class="meta">{() => h.meta()}</span>
    <Show when={h.text()}>
      <span class="text">{() => h.text()}</span>
    </Show>
    <Show when={h.scopes().length}>
      <span class="scopes">{() => h.scopes().join(', ')}</span>
    </Show>
  </div>
);

export const HistoryEntryView = viewToken<HistoryEntryLogic>('HistoryEntryView', historyEntryView);
