/** The default look: completed items as slim cards, then the permissions and instructions cards, then submit. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Textarea } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import type { ReviewSubmissionLogic } from './logic.js';

export const reviewSubmissionView = (s: ReviewSubmissionLogic) => (
  <div part="submission" class="submission">
    <style scoped>{`
      .submission { display: grid; gap: 14px; }
      .done { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 18px; border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); }
      .done strong { font-weight: 600; }
      .ok { color: var(--idp-ok); font-size: 13px; font-weight: 500; }
      .card { display: grid; gap: 14px; padding: 20px; border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); }
      .card[data-open] { border-color: color-mix(in srgb, var(--idp-warn) 45%, var(--idp-border)); }
      .head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .count { font-size: 13px; font-weight: 500; color: var(--idp-warn); }
      .card:not([data-open]) .count { color: var(--idp-ok); }
      .list { display: grid; gap: 10px; }
      .list > :deep(idp-scope-justification) { display: block; }
      label { display: grid; gap: 6px; font-size: 13px; font-weight: 500; }
      .hint { font-weight: 400; color: var(--idp-muted); font-size: 12.5px; }
      .foot { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
      p { margin: 0; }
      .status { color: var(--idp-ok); }
      .alert { color: var(--idp-bad); }
      .muted { color: var(--idp-muted); }
    `}</style>
    <For each={s.completed()} by={(item) => item.key}>
      {(item) => (
        <div class="done">
          <strong>{() => item().label}</strong>
          <span class="ok">{() => s.labels().complete}</span>
        </div>
      )}
    </For>
    <Show when={s.waiting().length} fallback={<p class="muted">{() => s.labels().noReviewNeeded}</p>}>
      <section class="card" data-open={() => (s.allExplained() ? undefined : '')} aria-labelledby="idp-submission-permissions">
        <div class="head">
          <h2 id="idp-submission-permissions">{() => s.labels().permissions}</h2>
          <span class="count">{() => s.explainedLine()}</span>
        </div>
        <div class="list">
          <For each={s.waiting()} by={(entry) => entry.scope}>
            {(entry) => (
              <idp-scope-justification
                scope={entry().scope}
                description={entry().description}
                question={s.labels().question}
                hint={s.labels().hint}
                explainedLabel={s.labels().explainedLabel}
                missingLabel={s.labels().missingLabel}
                value={s.justification(entry().scope)}
                onEdit={(event) => s.justify(entry().scope, event.detail.value)}
              />
            )}
          </For>
        </div>
      </section>
      <section class="card" aria-labelledby="idp-submission-instructions">
        <h2 id="idp-submission-instructions">{() => s.labels().instructions}</h2>
        <label>
          <span class="hint">{() => s.labels().instructionsHint}</span>
          <Textarea rows={4} value={() => s.instructions()} onInput={(event: Event) => s.editInstructions((event.target as HTMLTextAreaElement).value)} />
        </label>
      </section>
      <Show when={s.canSubmit()}>
        <div class="foot">
          <Button variant="solid" disabled={s.busy() || !s.allExplained()} onPress={() => void s.submit()}>
            {() => s.submitLabel()}
          </Button>
          <Show when={s.submitted()}>
            <p class="status" role="status">
              {() => s.labels().submitted}
            </p>
          </Show>
          <Show when={s.missing().length}>
            <p class="alert" role="alert">
              {() => `${s.labels().missing} ${s.missing().join(', ')}`}
            </p>
          </Show>
          <Show when={s.error()}>
            <p class="alert" role="alert">
              {() => s.error()}
            </p>
          </Show>
        </div>
      </Show>
    </Show>
  </div>
);

export const ReviewSubmissionView = viewToken<ReviewSubmissionLogic>('idp-review-submission', reviewSubmissionView);
