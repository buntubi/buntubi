/** The default look: a card, the avatar, the greeting over the address, the way to edit. */
import { Show } from '@fluixi/core';
import { Link } from '../link.js';
import { viewToken } from '../view.js';
import type { AccountHelloLogic } from './logic.js';

export const accountHelloView = (h: AccountHelloLogic) => (
  <section part="hello" class="hello">
    <style scoped>{`
      .hello { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 22px; display: flex; flex-wrap: wrap; align-items: center; gap: 18px; }
      .mark { width: 64px; height: 64px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; font-size: 22px; font-weight: 700; color: var(--idp-accent-ink); background: var(--idp-accent-soft); }
      .mark img { width: 100%; height: 100%; object-fit: cover; }
      .text { flex: 1; min-width: 220px; display: grid; gap: 2px; }
      h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; }
      .meta { color: var(--idp-muted); }
      .edit > :deep(a) { display: inline-flex; align-items: center; height: 34px; padding: 0 14px; border: 1px solid var(--idp-border-2); border-radius: 9px; color: var(--idp-text); font-weight: 500; text-decoration: none; }
      .edit > :deep(a:hover) { background: var(--idp-surface-2); }
    `}</style>
    <span class="mark" aria-hidden="true">
      <Show when={h.picture()} fallback={h.initials()}>
        <img src={h.picture()} alt="" />
      </Show>
    </span>
    <div class="text">
      <h1>{() => h.labels().welcome.replace('{name}', h.firstName())}</h1>
      <span class="meta">
        {() => h.email()}
        {() => (h.since() ? ` · ${h.labels().since.replace('{date}', h.since())}` : '')}
      </span>
    </div>
    <Show when={h.editHref()}>
      <span class="edit">
        <Link href={h.editHref()}>{() => h.labels().edit}</Link>
      </span>
    </Show>
  </section>
);

export const AccountHelloView = viewToken<AccountHelloLogic>('idp-account-hello', accountHelloView);
