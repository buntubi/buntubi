/** The default look: a round mark in the line's tone, the words, the fix at the end. */
import { Show } from '@fluixi/core';
import { Link } from '../link.js';
import { viewToken } from '../view.js';
import type { AccountCheckItemLogic } from './logic.js';

const ICON = { ok: 'M5 12l5 5L20 7', warn: 'M12 7v6M12 16.5v.5', info: 'M12 11v6M12 7.5v.5' } as const;

export const accountCheckItemView = (c: AccountCheckItemLogic) => (
  <div part="check" class="check" data-tone={() => c.tone()}>
    <style scoped>{`
      .check { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; padding: 12px 18px; border-top: 1px solid var(--idp-border); --tone: var(--idp-ok); }
      .check[data-tone='warn'] { --tone: var(--idp-warn); }
      .check[data-tone='info'] { --tone: var(--idp-info); }
      .mark { flex: none; width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; color: var(--tone); background: color-mix(in srgb, var(--tone) 14%, transparent); }
      .text { flex: 1; min-width: 220px; display: grid; }
      .title { font-weight: 500; }
      .note { color: var(--idp-muted); font-size: 12.5px; }
      .fix > :deep(a) { display: inline-flex; align-items: center; height: 32px; padding: 0 12px; border: 1px solid var(--idp-border-2); border-radius: 9px; color: var(--idp-text); font-weight: 500; text-decoration: none; }
      .fix > :deep(a:hover) { background: var(--idp-surface-2); }
    `}</style>
    <span class="mark" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d={ICON[c.tone()]} />
      </svg>
    </span>
    <span class="text">
      <span class="title">{() => c.title()}</span>
      <span class="note">{() => c.note()}</span>
    </span>
    <Show when={c.action() && c.href()}>
      <span class="fix">
        <Link href={c.href()}>{() => c.action()}</Link>
      </span>
    </Show>
  </div>
);

export const AccountCheckItemView = viewToken<AccountCheckItemLogic>('AccountCheckItemView', accountCheckItemView);
