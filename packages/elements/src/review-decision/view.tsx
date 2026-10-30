/** The decision's default look: the request and its history, beside the app's facts and the answer. */
import { For, Show } from '@fluixi/core';
import { Avatar, AvatarFallback, AvatarImage } from '@fluixi-ui/avatar';
import { Badge } from '@fluixi-ui/badge';
import { Button } from '@fluixi-ui/button';
import { Card } from '@fluixi-ui/card';
import { Input } from '@fluixi-ui/input';
import { toneColor, type Tone } from '../tone.js';
import { viewToken } from '../view.js';
import type { ReviewDecisionLogic } from './logic.js';

const valueOf = (event: Event) => (event.target as HTMLInputElement).value;
const TONE = { pending: 'info', approved: 'success', rejected: 'warning' } as const satisfies Record<string, Tone>;

export const reviewDecisionView = (d: ReviewDecisionLogic) => (
  <div part="review-decision" class="decision">
    <style scoped>{`
      .decision { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 16px; align-items: start; }
      .column { display: grid; gap: 16px; }
      .aside { position: sticky; top: 16px; }
      .card { padding: 18px 20px; display: grid; gap: 12px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .hint { margin: 0; color: var(--idp-muted); font-size: 13px; }
      .scope { display: grid; gap: 6px; padding: 12px 0; border-top: 1px solid var(--idp-border); }
      .scope:first-of-type { border-top: 0; padding-top: 0; }
      code { font-family: var(--idp-mono); font-size: 12.5px; font-weight: 600; }
      .desc { color: var(--idp-muted); font-size: 12.5px; }
      blockquote { margin: 0; padding: 10px 12px; border-radius: var(--idp-radius-sm); background: var(--idp-surface-2); font-size: 13.5px; white-space: pre-wrap; }
      .empty { color: var(--idp-bad); }
      .consent { display: grid; justify-items: center; gap: 10px; padding: 18px; border-radius: var(--idp-radius-sm); background: var(--idp-surface-2); text-align: center; font-size: 13.5px; }
      .mark { width: 44px; height: 44px; border-radius: 12px; font-size: 18px; font-weight: 700; }
      dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; font-size: 13px; }
      dt { color: var(--idp-muted); }
      dd { margin: 0; overflow-wrap: anywhere; }
      ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; font-size: 13px; }
      a { color: var(--idp-accent-ink); text-decoration: none; }
      .missing { color: var(--idp-bad); }
      .mono { font-family: var(--idp-mono); font-size: 12px; overflow-wrap: anywhere; }
      ol { list-style: none; margin: 0; padding: 0; display: grid; }
      li.entry { display: grid; gap: 4px; padding: 10px 0 10px 16px; border-left: 2px solid var(--idp-border); position: relative; font-size: 13px; }
      li.entry::before { content: ''; position: absolute; left: -6px; top: 14px; width: 10px; height: 10px; border-radius: 50%; background: var(--tone); }
      .pill { justify-self: start; }
      .line { color: var(--idp-muted); }
      .field { display: grid; gap: 6px; }
      .caption { font-size: 12.5px; font-weight: 500; }
      .note { color: var(--idp-muted); font-size: 12px; }
      .actions { display: flex; flex-wrap: wrap; gap: 8px; }
      .ok { color: var(--idp-ok); font-size: 13px; }
      .alert { margin: 0; color: var(--idp-bad); font-size: 13px; }
      @media (max-width: 960px) { .decision { grid-template-columns: 1fr; } .aside { position: static; } }
    `}</style>

    <div class="column">
      <Card class="card" part="request" aria-labelledby="idp-decision-request" role="region">
        <h2 id="idp-decision-request">{() => d.labels().request}</h2>
        <For each={d.requested()} by={(entry) => entry.scope}>
          {(entry) => (
            <div class="scope">
              <code>{() => entry().scope}</code>
              <Show when={entry().description}>
                <span class="desc">{() => entry().description}</span>
              </Show>
              <span class="caption">{() => d.labels().justification}</span>
              <Show when={entry().justification} fallback={<blockquote class="empty">{() => d.labels().noJustification}</blockquote>}>
                <blockquote>{() => entry().justification}</blockquote>
              </Show>
            </div>
          )}
        </For>
      </Card>
      <Card class="card" part="instructions" aria-labelledby="idp-decision-instructions" role="region">
        <h2 id="idp-decision-instructions">{() => d.labels().instructions}</h2>
        <Show when={d.instructions()} fallback={<p class="hint">{() => d.labels().noInstructions}</p>}>
          <blockquote>{() => d.instructions()}</blockquote>
        </Show>
      </Card>
      <Card class="card" part="history" aria-labelledby="idp-decision-history" role="region">
        <h2 id="idp-decision-history">{() => d.labels().history}</h2>
        <ol>
          <For each={d.history()} by={(entry) => entry.id}>
            {(entry) => (
              <li class="entry" style={() => `--tone: ${toneColor(TONE[entry().decision])}`}>
                <Badge class="pill" tone={TONE[entry().decision]}>
                  {() => d.labels().decisions[entry().decision]}
                </Badge>
                <span class="line">{() => entry().submittedLine}</span>
                <Show when={entry().decidedLine}>
                  <span class="line">{() => entry().decidedLine}</span>
                </Show>
                <Show when={entry().note}>
                  <blockquote>{() => entry().note}</blockquote>
                </Show>
              </li>
            )}
          </For>
        </ol>
      </Card>
    </div>

    <div class="column aside">
      <Card class="card" part="consent" aria-label={() => d.labels().consent} role="region">
        <span class="caption">{() => d.labels().consent}</span>
        <div class="consent">
          <Avatar class="mark">
            <Show when={d.review()?.logo} fallback={<AvatarFallback>{() => (d.review()?.name ?? '?').slice(0, 1).toUpperCase()}</AvatarFallback>}>
              <AvatarImage src={() => d.review()?.logo ?? ''} alt="" />
            </Show>
          </Avatar>
          <span>
            {() =>
              d
                .labels()
                .consentText.replace('{app}', d.review()?.name ?? '')
                .replace('{platform}', d.platform())
            }
          </span>
          <Show when={d.review()?.description}>
            <span class="desc">{() => d.review()?.description ?? ''}</span>
          </Show>
        </div>
        <dl>
          <dt>{() => d.labels().organization}</dt>
          <dd>{() => d.review()?.organization?.name ?? d.labels().none}</dd>
          <dt>{() => d.labels().owner}</dt>
          <dd>{() => d.review()?.owner?.email ?? d.labels().none}</dd>
          <dt>{() => d.labels().support}</dt>
          <dd>{() => d.review()?.organization?.support_email ?? d.labels().none}</dd>
        </dl>
      </Card>
      <Card class="card" part="links" aria-label={() => d.labels().links} role="region">
        <span class="caption">{() => d.labels().links}</span>
        <ul>
          <For each={['homepage_url', 'privacy_url', 'terms_url'] as const}>
            {(field) => (
              <li>
                <Show
                  when={d.review()?.[field]}
                  fallback={
                    <span class="missing">
                      {() => `${d.labels()[field === 'homepage_url' ? 'homepage' : field === 'privacy_url' ? 'privacy' : 'terms']} (${d.labels().missing})`}
                    </span>
                  }
                >
                  <a href={() => d.review()?.[field] ?? ''} target="_blank" rel="noopener noreferrer">
                    {() => d.labels()[field === 'homepage_url' ? 'homepage' : field === 'privacy_url' ? 'privacy' : 'terms']}
                  </a>
                </Show>
              </li>
            )}
          </For>
        </ul>
        <span class="caption">{() => d.labels().redirects}</span>
        <ul>
          <For each={d.review()?.redirect_uris ?? []}>{(uri) => <li class="mono">{uri}</li>}</For>
        </ul>
      </Card>
      <Card class="card" part="answer" aria-labelledby="idp-decision-answer" role="region">
        <h2 id="idp-decision-answer">{() => d.labels().decision}</h2>
        <Show when={d.pending() && !d.done()} fallback={<p class="hint">{() => (d.done() ? d.labels().decided : d.labels().notPending)}</p>}>
          <label class="field">
            <span class="caption">{() => d.labels().note}</span>
            <Input value={() => d.note()} onInput={(event: Event) => d.editNote(valueOf(event))} />
            <span class="note">{() => d.labels().noteHint}</span>
          </label>
          <div class="actions">
            <Button variant="solid" part="approve" disabled={d.busy()} onPress={() => void d.decide(true)}>
              {() => d.labels().approve}
            </Button>
            <Button variant="outline" tone="danger" part="reject" disabled={d.busy() || !d.canReject()} onPress={() => void d.decide(false)}>
              {() => d.labels().reject}
            </Button>
          </div>
        </Show>
        <Show when={d.error()}>
          <p class="alert" role="alert">
            {() => d.error()}
          </p>
        </Show>
      </Card>
    </div>
  </div>
);

export const ReviewDecisionView = viewToken<ReviewDecisionLogic>('idp-review-decision', reviewDecisionView);
