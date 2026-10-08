/** The way to live's default look: a stepper, then the checklist and the request to go live. */
import { For, Show } from '@fluixi/core';
import { Link } from '@fluixi/core/router';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { LaunchPathLogic } from './logic.js';

const CHECK = 'M5 12.5l4.5 4.5L19 7.5';

export const launchPathView = (l: LaunchPathLogic) => (
  <div part="launch-path" class="launch">
    <style scoped>{`
      .launch { display: grid; gap: 16px; }
      .card { border: 1px solid var(--dp-border); border-radius: var(--dp-radius); background: var(--dp-surface); box-shadow: var(--dp-shadow); padding: 18px 20px; }
      .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 18px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .muted { color: var(--dp-muted); font-size: 13px; }
      ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 0; }
      li.step { position: relative; display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; font-size: 12.5px; color: var(--dp-muted); }
      li.step::after { content: ''; position: absolute; top: 13px; left: calc(50% + 16px); right: calc(-50% + 16px); height: 2px; background: var(--dp-border); }
      li.step:last-child::after { display: none; }
      li.step[data-state='done']::after { background: var(--dp-accent); }
      li.step[data-state='done'], li.step[data-state='now'], li.step[data-state='warn'] { color: var(--dp-text); }
      li.step[data-state='now'], li.step[data-state='warn'] { font-weight: 600; }
      .dot { width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 600; border: 1.5px solid var(--dp-border-2); background: var(--dp-surface); color: var(--dp-muted); }
      [data-state='done'] > .dot { border-color: transparent; background: var(--dp-accent); color: var(--dp-accent-fg); }
      [data-state='now'] > .dot { border-color: var(--dp-accent); color: var(--dp-accent-ink); background: var(--dp-accent-soft); }
      [data-state='warn'] > .dot { border-color: var(--dp-warn); color: var(--dp-warn); background: color-mix(in srgb, var(--dp-warn) 14%, transparent); }
      ul { list-style: none; margin: 0; padding: 0; }
      li.check { display: grid; grid-template-columns: 22px 1fr auto; align-items: center; gap: 12px; padding: 11px 0; border-top: 1px solid var(--dp-border); font-size: 13.5px; }
      li.check:first-child { border-top: 0; }
      .mark { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; border: 1.5px solid var(--dp-border-2); }
      [data-state='done'] > .mark { border: 0; color: var(--dp-ok); background: color-mix(in srgb, var(--dp-ok) 14%, transparent); }
      [data-state='warn'] > .mark { border: 0; color: var(--dp-warn); background: color-mix(in srgb, var(--dp-warn) 16%, transparent); font-weight: 700; font-size: 12px; }
      .label { display: flex; flex-direction: column; gap: 2px; }
      .detail { color: var(--dp-muted); font-size: 12.5px; }
      .tag { margin-left: 6px; font-size: 11px; color: var(--dp-muted); }
      li.check :deep(a) { font-size: 13px; color: var(--dp-accent-ink); text-decoration: none; font-weight: 500; }
      .actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 16px; }
      .actions :deep(.cta) { display: inline-flex; align-items: center; height: 36px; padding: 0 16px; border-radius: var(--dp-radius-sm); background: var(--dp-accent); color: var(--dp-accent-fg); font-weight: 500; text-decoration: none; }
      .alert { margin: 12px 0 0; color: var(--dp-bad); font-size: 13px; }
      @media (max-width: 720px) {
        ol { grid-template-columns: 1fr; gap: 10px; }
        li.step { flex-direction: row; text-align: left; }
        li.step::after { display: none; }
      }
    `}</style>
    <section part="path" class="card" aria-labelledby="dp-launch-path">
      <div class="head">
        <h2 id="dp-launch-path">{() => l.labels().path}</h2>
        <span class="muted">
          {() =>
            l
              .labels()
              .stepOf.replace('{n}', String(l.position()))
              .replace('{total}', String(l.steps().length))
          }
        </span>
      </div>
      <ol>
        <For each={l.steps()}>
          {(step, index) => (
            <li class="step" data-state={step.state} aria-current={step.state === 'now' || step.state === 'warn' ? 'step' : undefined}>
              <span class="dot">
                <Show when={step.state === 'done'} fallback={step.state === 'warn' ? '!' : String(index() + 1)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d={CHECK} />
                  </svg>
                </Show>
              </span>
              <span>{() => l.labels().steps[step.key]}</span>
            </li>
          )}
        </For>
      </ol>
    </section>
    <section part="checklist" class="card" aria-labelledby="dp-launch-checklist">
      <div class="head">
        <h2 id="dp-launch-checklist">{() => l.labels().checklist}</h2>
        <Show when={l.status()}>{() => <span class="muted">{l.status()}</span>}</Show>
      </div>
      <ul>
        <For each={l.checklist()}>
          {(row) => (
            <li class="check" data-state={row.state} part="check">
              <span class="mark">
                <Show when={row.state === 'done'} fallback={row.state === 'warn' ? '!' : ''}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d={CHECK} />
                  </svg>
                </Show>
              </span>
              <span class="label">
                <span>
                  {() => l.labels().checks[row.key]}
                  <Show when={row.required && row.state !== 'done'}>
                    <span class="tag">{() => l.labels().required}</span>
                  </Show>
                </span>
                <Show when={row.detail && row.state !== 'done'}>
                  <span class="detail">{row.detail}</span>
                </Show>
              </span>
              <Show when={row.href && row.state !== 'done'}>
                <Link href={row.href ?? ''}>{() => l.labels().fix}</Link>
              </Show>
            </li>
          )}
        </For>
      </ul>
      <Show when={l.action() && l.canPublish()}>
        <div class="actions">
          <Show
            when={l.reviewHref()}
            fallback={
              <Button variant="solid" part="publish" disabled={l.busy()} onPress={l.publish}>
                {() => l.action()}
              </Button>
            }
          >
            <Link href={l.reviewHref()} class="cta" part="publish">
              {() => l.action()}
            </Link>
          </Show>
        </div>
      </Show>
      <Show when={l.missing().length}>
        <p class="alert" role="alert">
          {() => `${l.labels().missing} ${l.missing().join(', ')}`}
        </p>
      </Show>
      <Show when={l.error()}>
        <p class="alert" role="alert">
          {() => l.error()}
        </p>
      </Show>
    </section>
  </div>
);

export const LaunchPathView = viewToken<LaunchPathLogic>('LaunchPathView', launchPathView);
