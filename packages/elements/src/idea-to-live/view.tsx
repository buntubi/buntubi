/** The default look: a card, numbered chips joined by arrows, wrapping as the width asks. */
import { For } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { IdeaToLiveLogic } from './logic.js';

export const ideaToLiveView = (i: IdeaToLiveLogic) => (
  <section part="idea-to-live" class="card" aria-labelledby="idp-idea-title">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 20px 22px; display: grid; gap: 14px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      ol { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 0; }
      li { display: flex; align-items: center; }
      li + li::before { content: '→'; margin: 0 12px; color: var(--idp-muted); }
      .chip { display: inline-flex; align-items: center; gap: 8px; padding: 5px 10px; border-radius: 8px; background: var(--idp-surface-2); font-size: 13px; font-weight: 500; }
      .n { color: var(--idp-muted); font-weight: 400; }
    `}</style>
    <h2 id="idp-idea-title">{() => i.labels().title}</h2>
    <ol>
      <For each={i.labels().steps}>
        {(step, index) => (
          <li>
            <span class="chip">
              <span class="n">{() => String(index() + 1)}</span>
              {step}
            </span>
          </li>
        )}
      </For>
    </ol>
  </section>
);

export const IdeaToLiveView = viewToken<IdeaToLiveLogic>('IdeaToLiveView', ideaToLiveView);
