/** The default look: a card with a heading and the entries down a timeline. */
import { For, Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { ReviewHistoryLogic } from './logic.js';

export const reviewHistoryView = (h: ReviewHistoryLogic) => (
  <section part="review-history" class="card" aria-labelledby="idp-review-history-title">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 20px 22px 6px; display: grid; gap: 16px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .list > :deep(idp-history-entry) { display: block; }
      .empty { margin: 0 0 14px; color: var(--idp-muted); }
    `}</style>
    <h2 id="idp-review-history-title">{() => h.labels().title}</h2>
    <Show when={h.entries().length} fallback={<p class="empty">{() => h.labels().empty}</p>}>
      <div class="list">
        <For each={h.entries()} by={(entry) => entry.key}>
          {(entry) => (
            <idp-history-entry
              title={entry().title}
              meta={entry().meta}
              text={entry().text}
              scopes={entry().scopes}
              date={entry().date}
              tone={entry().tone}
            />
          )}
        </For>
      </div>
    </Show>
  </section>
);

export const ReviewHistoryView = viewToken<ReviewHistoryLogic>('idp-review-history', reviewHistoryView);
