/** The default look: a card in the stage's tone, the note as a reviewer's message, the actions. */
import { For, Show } from '@fluixi/core';
import { useNavigate } from '@fluixi/core/router';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { ReviewRequestLogic } from './logic.js';

const TONE = { draft: 'var(--idp-border-2)', in_review: 'var(--idp-info)', changes_requested: 'var(--idp-warn)', live: 'var(--idp-ok)' } as const;

export const reviewRequestView = (r: ReviewRequestLogic) => {
  const navigate = useNavigate();
  return (
    <section part="review-request" class="card" style={() => `--tone: ${TONE[r.stage()]}`} aria-labelledby="idp-review-request-title">
      <style scoped>{`
        .card { border: 1px solid color-mix(in srgb, var(--tone) 55%, var(--idp-border)); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 20px 22px; display: grid; gap: 14px; }
        .head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
        h2 { margin: 0; font-size: 16px; font-weight: 600; }
        .date { color: var(--idp-muted); font-size: 13px; }
        p { margin: 0; color: var(--idp-muted); }
        .message { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 12px; align-items: start; }
        .who { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-size: 11.5px; font-weight: 600; color: var(--idp-muted); background: var(--idp-surface-2); }
        .bubble { padding: 12px 14px; border-radius: 10px; background: var(--idp-surface-2); }
        .concerns { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; color: var(--idp-muted); font-size: 13px; }
        code { font-size: 12px; padding: 2px 7px; border-radius: 6px; background: var(--idp-surface-2); border: 1px solid var(--idp-border); color: var(--idp-text); }
        .actions { display: flex; flex-wrap: wrap; gap: 8px; }
      `}</style>
      <div class="head">
        <h2 id="idp-review-request-title">{() => r.labels().titles[r.stage()]}</h2>
        <Show when={r.date()}>
          <span class="date">{() => r.date()}</span>
        </Show>
      </div>
      <Show when={r.note()} fallback={<p>{() => r.labels().texts[r.stage()]}</p>}>
        <div class="message">
          <span class="who" aria-hidden="true">{() => r.labels().reviewer}</span>
          <span class="bubble">{() => r.note()}</span>
        </div>
      </Show>
      <Show when={r.concerns().length}>
        <div class="concerns">
          {() => r.labels().concerns}
          <For each={r.concerns()}>{(scope) => <code>{scope}</code>}</For>
        </div>
      </Show>
      <Show when={r.canSubmit()}>
        <div class="actions">
          <Show when={r.stage() === 'changes_requested' && r.updateHref()}>
            <Button variant="outline" tone="neutral" onPress={() => navigate(r.updateHref())}>
              {() => r.labels().update}
            </Button>
          </Show>
          <Button variant="solid" onPress={() => navigate(r.submitHref())}>
            {() => (r.stage() === 'changes_requested' ? r.labels().resubmit : r.labels().submit)}
          </Button>
        </div>
      </Show>
    </section>
  );
};

export const ReviewRequestView = viewToken<ReviewRequestLogic>('ReviewRequestView', reviewRequestView);
