/** The app review's default look: readiness and status side by side, the form, then the history. */
import { For, Show } from '@fluixi/core';
import { Link } from '@fluixi/core/router';
import { Button } from '@fluixi-ui/button';
import { Input } from '@fluixi-ui/input';
import { viewToken } from '../view.js';
import type { AppReviewLogic } from './logic.js';

const valueOf = (event: Event) => (event.target as HTMLInputElement).value;
const TONE = {
  draft: 'var(--dp-muted)',
  in_review: 'var(--dp-info)',
  changes_requested: 'var(--dp-warn)',
  live: 'var(--dp-ok)',
  pending: 'var(--dp-info)',
  approved: 'var(--dp-ok)',
  rejected: 'var(--dp-warn)',
} as const;

export const appReviewView = (r: AppReviewLogic) => (
  <div part="app-review" class="review">
    <style scoped>{`
      .review { display: grid; gap: 16px; }
      .top { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 16px; }
      .card { border: 1px solid var(--dp-border); border-radius: var(--dp-radius); background: var(--dp-surface); box-shadow: var(--dp-shadow); padding: 18px 20px; display: grid; gap: 12px; align-content: start; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .hint { margin: 0; color: var(--dp-muted); font-size: 13px; }
      .meter { height: 8px; border-radius: 999px; background: var(--dp-surface-2); overflow: hidden; }
      .meter span { display: block; height: 100%; background: var(--dp-accent); border-radius: inherit; }
      .figure { display: flex; align-items: baseline; gap: 10px; }
      .figure strong { font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
      ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
      li.open { display: flex; justify-content: space-between; gap: 8px; font-size: 13.5px; }
      li.open :deep(a), .card :deep(a.fix) { color: var(--dp-accent-ink); text-decoration: none; font-weight: 500; font-size: 13px; }
      .pill { display: inline-flex; align-items: center; gap: 6px; width: fit-content; padding: 2px 9px; border-radius: 999px; font-size: 12px; font-weight: 500; color: var(--tone); background: color-mix(in srgb, var(--tone) 14%, transparent); }
      .pill::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
      .feedback { display: grid; gap: 4px; padding: 12px 14px; border-radius: var(--dp-radius-sm); background: color-mix(in srgb, var(--dp-warn) 9%, transparent); border: 1px solid color-mix(in srgb, var(--dp-warn) 35%, transparent); font-size: 13.5px; }
      .field { display: grid; gap: 6px; }
      .caption { font-size: 13px; font-weight: 500; }
      .caption code { font-family: var(--dp-mono); font-size: 12.5px; }
      .note { color: var(--dp-muted); font-size: 12px; }
      .actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
      .ok { color: var(--dp-ok); font-size: 13px; }
      .alert { margin: 0; color: var(--dp-bad); font-size: 13px; }
      ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 0; }
      li.entry { display: grid; gap: 6px; padding: 12px 0 12px 18px; border-left: 2px solid var(--dp-border); position: relative; }
      li.entry::before { content: ''; position: absolute; left: -6px; top: 16px; width: 10px; height: 10px; border-radius: 50%; background: var(--tone); }
      .line { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: 13px; color: var(--dp-muted); }
      code.scope { font-family: var(--dp-mono); font-size: 11.5px; padding: 1px 6px; border-radius: 6px; background: var(--dp-surface-2); border: 1px solid var(--dp-border); }
      details { font-size: 13px; }
      summary { cursor: pointer; color: var(--dp-accent-ink); }
      dl { margin: 8px 0 0; display: grid; gap: 6px; }
      dt { font-family: var(--dp-mono); font-size: 12px; }
      dd { margin: 0; color: var(--dp-muted); white-space: pre-wrap; }
      @media (max-width: 860px) { .top { grid-template-columns: 1fr; } }
    `}</style>

    <div class="top">
      <section class="card" part="readiness" aria-labelledby="dp-review-readiness">
        <h2 id="dp-review-readiness">{() => r.labels().readiness}</h2>
        <div class="figure">
          <strong>{() => `${r.percent()} %`}</strong>
          <span class="hint">{() => r.readinessCount()}</span>
        </div>
        <div class="meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={() => r.percent()}>
          <span style={() => `width: ${r.percent()}%`} />
        </div>
        <Show when={r.openItems().length} fallback={<p class="hint">{() => r.labels().ready}</p>}>
          <ul>
            <For each={r.openItems()} by={(item) => item.key}>
              {(item) => (
                <li class="open">
                  <span>{() => r.labels().checks[item().key]}</span>
                  <Show when={item().href}>
                    <Link href={item().href ?? ''}>{() => r.labels().fix}</Link>
                  </Show>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </section>
      <section class="card" part="status" aria-labelledby="dp-review-status">
        <h2 id="dp-review-status">{() => r.labels().status}</h2>
        <span class="pill" style={() => `--tone: ${TONE[r.stage()]}`}>
          {() => r.labels().stages[r.stage()]}
        </span>
        <p class="hint">{() => r.labels().stageTexts[r.stage()]}</p>
        <Show when={r.note()}>
          <div class="feedback" role="note">
            <strong>{() => r.labels().feedback}</strong>
            <span>{() => r.note()}</span>
          </div>
        </Show>
      </section>
    </div>

    <Show when={r.canSubmit()}>
      <form
        class="card"
        part="submission"
        aria-labelledby="dp-review-submission"
        onSubmit={(event: SubmitEvent) => {
          event.preventDefault();
          void r.submit();
        }}
      >
        <h2 id="dp-review-submission">{() => r.labels().submission}</h2>
        <p class="hint">{() => r.labels().submissionIntro}</p>
        <For each={r.waiting()} by={(entry) => entry.scope}>
          {(entry) => (
            <label class="field">
              <span class="caption">
                {() => r.labels().justify.split('{scope}')[0]}
                <code>{() => entry().scope}</code>
                {() => r.labels().justify.split('{scope}')[1] ?? ''}
              </span>
              <Show when={entry().description}>
                <span class="note">{() => entry().description}</span>
              </Show>
              <Input
                value={() => r.justification(entry().scope)}
                required
                onInput={(event: Event) => r.justify(entry().scope, valueOf(event))}
              />
              <span class="note">{() => r.labels().justifyHint}</span>
            </label>
          )}
        </For>
        <label class="field">
          <span class="caption">{() => r.labels().instructions}</span>
          <Input value={() => r.instructions()} onInput={(event: Event) => r.editInstructions(valueOf(event))} />
          <span class="note">{() => r.labels().instructionsHint}</span>
        </label>
        <div class="actions">
          <Button type="submit" variant="solid" disabled={r.busy()}>
            {() => r.submitLabel()}
          </Button>
          <Show when={r.submitted()}>
            <span class="ok" role="status">{() => r.labels().submitted}</span>
          </Show>
        </div>
        <Show when={r.missing().length}>
          <p class="alert" role="alert">
            {() => `${r.labels().missing} ${r.missing().join(', ')}`}
          </p>
        </Show>
        <Show when={r.error()}>
          <p class="alert" role="alert">
            {() => r.error()}
          </p>
        </Show>
      </form>
    </Show>
    <Show when={!r.waiting().length && r.stage() !== 'live'}>
      <p class="hint">{() => r.labels().noReviewNeeded}</p>
    </Show>

    <section class="card" part="history" aria-labelledby="dp-review-history">
      <h2 id="dp-review-history">{() => r.labels().history}</h2>
      <Show when={r.history().length} fallback={<p class="hint">{() => r.labels().noHistory}</p>}>
        <ol>
          <For each={r.history()} by={(entry) => entry.id}>
            {(entry) => (
              <li class="entry" style={() => `--tone: ${TONE[entry().decision]}`}>
                <span class="pill" style={() => `--tone: ${TONE[entry().decision]}`}>
                  {() => r.labels().decisions[entry().decision]}
                </span>
                <span class="line">
                  <span>{() => entry().submittedLine}</span>
                  <Show when={entry().decidedLine}>
                    <span>{() => `· ${entry().decidedLine}`}</span>
                  </Show>
                </span>
                <span class="line">
                  <span>{() => r.labels().asked}</span>
                  <For each={entry().scopes}>{(scope) => <code class="scope">{scope}</code>}</For>
                </span>
                <Show when={entry().note}>
                  <div class="feedback">
                    <strong>{() => r.labels().feedback}</strong>
                    <span>{() => entry().note}</span>
                  </div>
                </Show>
                <Show when={Object.keys(entry().justifications).length || entry().instructions}>
                  <details>
                    <summary>{() => r.labels().showSubmission}</summary>
                    <dl>
                      <For each={Object.entries(entry().justifications)}>
                        {([scope, text]) => (
                          <div>
                            <dt>{scope}</dt>
                            <dd>{text}</dd>
                          </div>
                        )}
                      </For>
                      <Show when={entry().instructions}>
                        <div>
                          <dt>{() => r.labels().instructions}</dt>
                          <dd>{() => entry().instructions}</dd>
                        </div>
                      </Show>
                    </dl>
                  </details>
                </Show>
              </li>
            )}
          </For>
        </ol>
      </Show>
    </section>
  </div>
);

export const AppReviewView = viewToken<AppReviewLogic>('AppReviewView', appReviewView);
