/** The default look: a card that is one link, the mark and title, the note, the way in. */
import { Link } from '../link.js';
import { viewToken } from '../view.js';
import type { AccountAreaLogic } from './logic.js';

export const accountAreaView = (a: AccountAreaLogic) => (
  <div part="area" class="area">
    <style scoped>{`
      .area > :deep(a) { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); height: 100%; box-sizing: border-box; padding: 18px; display: flex; flex-direction: column; gap: 10px; color: var(--idp-text); text-decoration: none; }
      .area > :deep(a:hover) { border-color: var(--idp-border-2); }
      .top { display: flex; align-items: center; gap: 10px; }
      .mark { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; background: var(--idp-surface-2); }
      .title { font-weight: 600; font-size: 15px; }
      .note { color: var(--idp-muted); font-size: 13px; }
      .go { color: var(--idp-accent-ink); font-size: 13px; font-weight: 500; }
    `}</style>
    <Link href={a.href()}>
      <span class="top">
        <span class="mark" aria-hidden="true">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d={a.icon()} />
          </svg>
        </span>
        <span class="title">{() => a.title()}</span>
      </span>
      <span class="note">{() => a.note()}</span>
      <span class="go">{() => `${a.link()} →`}</span>
    </Link>
  </div>
);

export const AccountAreaView = viewToken<AccountAreaLogic>('AccountAreaView', accountAreaView);
