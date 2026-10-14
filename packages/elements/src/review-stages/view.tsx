/** The default look: a tinted track, passed stages ticked, the current one raised in its tone. */
import { For } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { ReviewStagesLogic } from './logic.js';

const TONE: Record<string, string> = {
  changes_requested: 'var(--idp-warn)',
  in_review: 'var(--idp-info)',
  live: 'var(--idp-ok)',
};

export const reviewStagesView = (r: ReviewStagesLogic) => (
  <ol part="stages" class="strip" aria-label={() => r.labels().label}>
    <style scoped>{`
      .strip { list-style: none; margin: 0; padding: 3px; display: flex; flex-wrap: wrap; gap: 2px; border-radius: 9px; background: var(--idp-surface-2); }
      li { padding: 5px 10px; border-radius: 7px; font-size: 12.5px; font-weight: 500; color: var(--idp-muted); }
      li[data-state='passed'] { color: var(--idp-text); }
      li[data-state='passed']::before { content: '✓ '; }
      li[data-state='current'] { background: var(--idp-surface); color: var(--tone, var(--idp-text)); box-shadow: 0 1px 2px rgb(0 0 0 / 0.08); font-weight: 600; }
    `}</style>
    <For each={r.stages()} by={(entry) => entry.stage}>
      {(entry) => (
        <li
          data-state={() => entry().state}
          aria-current={() => (entry().state === 'current' ? 'step' : undefined)}
          style={() => (TONE[entry().stage] ? `--tone: ${TONE[entry().stage]}` : '')}
        >
          {() => r.labels().stages[entry().stage]}
        </li>
      )}
    </For>
  </ol>
);

export const ReviewStagesView = viewToken<ReviewStagesLogic>('idp-review-stages', reviewStagesView);
