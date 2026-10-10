/** The default look: a card, the title and progress over the lines. */
import { For } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { AccountCheckLogic } from './logic.js';

export const accountCheckView = (c: AccountCheckLogic) => (
  <section part="account-check" class="card" aria-labelledby="idp-account-check-title">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); }
      .head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 18px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .summary { color: var(--idp-muted); font-size: 13px; }
      .bar { width: 160px; height: 6px; border-radius: 999px; background: var(--idp-surface-2); overflow: hidden; }
      .fill { height: 100%; background: var(--idp-ok); }
      .rows > :deep(idp-account-check-item) { display: block; }
    `}</style>
    <div class="head">
      <div>
        <h2 id="idp-account-check-title">{() => c.labels().title}</h2>
        <span class="summary">
          {() =>
            c.labels().progress.replace('{done}', String(c.done())).replace('{total}', String(c.checks().length)) +
            ' ' +
            (c.done() === c.checks().length ? c.labels().allDone : c.labels().left)
          }
        </span>
      </div>
      <div class="bar" aria-hidden="true">
        <div class="fill" style={() => `width: ${c.percent()}%`} />
      </div>
    </div>
    <div class="rows">
      <For each={c.checks()} by={(check) => check.key}>
        {(check) => (
          <idp-account-check-item
            title={check().title}
            note={check().note}
            tone={check().tone}
            action={check().action ?? ''}
            href={check().href ?? ''}
          />
        )}
      </For>
    </div>
  </section>
);

export const AccountCheckView = viewToken<AccountCheckLogic>('AccountCheckView', accountCheckView);
