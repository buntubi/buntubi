/** The default look: a card, the marks joined by a rule, each label under its mark. */
import { For, Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { PathToLiveLogic } from './logic.js';

const CHECK = 'M5 12.5l4.5 4.5L19 7.5';

export const pathToLiveView = (p: PathToLiveLogic) => (
  <section part="path" class="card" aria-labelledby="idp-path-title">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 20px 22px; display: grid; gap: 18px; }
      .head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      .position { color: var(--idp-muted); font-size: 13px; }
      ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); }
      li { display: grid; gap: 8px; min-width: 0; }
      .track { display: flex; align-items: center; }
      .track::after { content: ''; flex: 1; height: 2px; background: var(--idp-border); }
      li:last-child .track::after { display: none; }
      li[data-state='done'] .track::after { background: var(--idp-accent); }
      .mark { flex: none; width: 24px; height: 24px; box-sizing: border-box; border-radius: 50%; display: grid; place-items: center; font-size: 11.5px; font-weight: 600; border: 1.5px solid var(--idp-border-2); color: var(--idp-muted); background: var(--idp-surface); }
      [data-state='done'] .mark { border: 0; background: var(--idp-accent); color: var(--idp-accent-fg); }
      [data-state='now'] .mark { border-color: var(--idp-accent); color: var(--idp-accent-ink); }
      [data-state='warn'] .mark { border-color: var(--idp-warn); color: var(--idp-warn); background: color-mix(in srgb, var(--idp-warn) 10%, var(--idp-surface)); }
      .label { font-size: 13px; color: var(--idp-muted); padding-right: 8px; }
      [data-state='done'] .label { color: var(--idp-text); }
      [data-state='now'] .label, [data-state='warn'] .label { color: var(--idp-text); font-weight: 600; }
      @media (max-width: 860px) { ol { grid-template-columns: repeat(4, minmax(0, 1fr)); row-gap: 16px; } li:nth-child(4) .track::after { display: none; } }
    `}</style>
    <div class="head">
      <h2 id="idp-path-title">{() => p.labels().title}</h2>
      <span class="position">{() => p.position()}</span>
    </div>
    <ol>
      <For each={p.steps()} by={(step) => step.key}>
        {(step, index) => (
          <li data-state={() => step().state} aria-current={() => (step().state === 'now' || step().state === 'warn' ? 'step' : undefined)}>
            <span class="track">
              <span class="mark">
                <Show when={step().state === 'done'} fallback={String(index() + 1)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d={CHECK} />
                  </svg>
                </Show>
              </span>
            </span>
            <span class="label">{() => p.labels().steps[step().key]}</span>
          </li>
        )}
      </For>
    </ol>
  </section>
);

export const PathToLiveView = viewToken<PathToLiveLogic>('PathToLiveView', pathToLiveView);
