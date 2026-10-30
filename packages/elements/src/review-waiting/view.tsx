/** The default look: a card, a heading, the waiting apps divided by rules. */
import { For, Show } from '@fluixi/core';
import { Card } from '@fluixi-ui/card';
import { viewToken } from '../view.js';
import type { ReviewWaitingLogic } from './logic.js';

export const reviewWaitingView = (r: ReviewWaitingLogic) => (
  <Card part="waiting" class="card" aria-labelledby="idp-review-waiting-title" role="region">
    <style scoped>{`
      .card { padding: 18px 20px; display: grid; gap: 6px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .hint { margin: 0; color: var(--idp-muted); font-size: 13px; }
      .list > :deep(idp-waiting-app + idp-waiting-app) { border-top: 1px solid var(--idp-border); }
      .list > :deep(idp-waiting-app) { display: block; }
    `}</style>
    <h2 id="idp-review-waiting-title">{() => r.labels().title}</h2>
    <Show when={r.entries().length} fallback={<p class="hint">{() => r.labels().empty}</p>}>
      <div class="list">
        <For each={r.entries()} by={(entry) => entry.client_id}>
          {(entry) => (
            <idp-waiting-app
              name={entry().name}
              organization={entry().organization}
              scopes={entry().scopes}
              href={entry().href}
              open={r.labels().open}
            />
          )}
        </For>
      </div>
    </Show>
  </Card>
);

export const ReviewWaitingView = viewToken<ReviewWaitingLogic>('idp-review-waiting', reviewWaitingView);
