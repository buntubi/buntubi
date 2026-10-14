/** The default look: numbered marks joined by rules, a tick once a step is done. */
import { For, Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { StepIndicatorLogic } from './logic.js';

const CHECK = 'M5 12.5l4.5 4.5L19 7.5';

export const stepIndicatorView = (s: StepIndicatorLogic) => (
  <ol part="steps" class="steps" aria-label={() => s.label()}>
    <style scoped>{`
      .steps { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
      li { display: flex; align-items: center; gap: 8px; color: var(--idp-muted); font-weight: 500; }
      li + li::before { content: ''; width: 40px; height: 1px; background: var(--idp-border-2); margin-right: 4px; }
      li[data-state='now'], li[data-state='done'] { color: var(--idp-text); }
      li[data-state='now'] { font-weight: 600; }
      .mark { width: 24px; height: 24px; box-sizing: border-box; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 600; border: 1.5px solid var(--idp-border-2); color: var(--idp-muted); }
      [data-state='now'] > .mark { border-color: var(--idp-accent); color: var(--idp-accent-ink); background: color-mix(in srgb, var(--idp-accent) 10%, transparent); }
      [data-state='done'] > .mark { border: 0; background: var(--idp-accent); color: var(--idp-accent-fg); }
    `}</style>
    <For each={s.steps()} by={(step) => step.label}>
      {(step, index) => (
        <li data-state={() => step().state} aria-current={() => (step().state === 'now' ? 'step' : undefined)}>
          <span class="mark">
            <Show when={step().state === 'done'} fallback={String(index() + 1)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d={CHECK} />
              </svg>
            </Show>
          </span>
          <span>{() => step().label}</span>
        </li>
      )}
    </For>
  </ol>
);

export const StepIndicatorView = viewToken<StepIndicatorLogic>('idp-step-indicator', stepIndicatorView);
