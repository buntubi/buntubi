/** The default look: a card, numbered chips joined by arrows, wrapping as the width asks. */
import { For } from '@fluixi/core';
import { Card } from '@fluixi-ui/card';
import { Chip } from '@fluixi-ui/chip';
import { viewToken } from '../view.js';
import type { IdeaToLiveLogic } from './logic.js';

export const ideaToLiveView = (i: IdeaToLiveLogic) => (
  <Card part="idea-to-live" class="card" aria-labelledby="idp-idea-title" role="region">
    <style scoped>{`
      .card { padding: 20px 22px; display: grid; gap: 14px; }
      h2 { margin: 0; font-size: 15px; font-weight: 600; }
      ol { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 0; }
      li { display: flex; align-items: center; }
      li + li::before { content: '→'; margin: 0 12px; color: var(--idp-muted); }
      .n { color: var(--idp-muted); font-weight: 400; }
    `}</style>
    <h2 id="idp-idea-title">{() => i.labels().title}</h2>
    <ol>
      <For each={i.labels().steps}>
        {(step, index) => (
          <li>
            <Chip media={<span class="n">{() => String(index() + 1)}</span>}>{step}</Chip>
          </li>
        )}
      </For>
    </ol>
  </Card>
);

export const IdeaToLiveView = viewToken<IdeaToLiveLogic>('idp-idea-to-live', ideaToLiveView);
