/** The default look: the heading and line, then three cards to a row. */
import { For } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { KindPickerLogic } from './logic.js';

export const kindPickerView = (p: KindPickerLogic) => (
  <section part="kinds" class="kinds" aria-labelledby="idp-kind-picker-title">
    <style scoped>{`
      .kinds { display: grid; gap: 18px; }
      .head { display: grid; gap: 6px; }
      h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; }
      p { margin: 0; color: var(--idp-muted); }
      .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      @media (max-width: 860px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @media (max-width: 560px) { .grid { grid-template-columns: 1fr; } }
    `}</style>
    <div class="head">
      <h1 id="idp-kind-picker-title">{() => p.title()}</h1>
      <p>{() => p.intro()}</p>
    </div>
    <div class="grid" role="group" aria-labelledby="idp-kind-picker-title">
      <For each={p.kinds()} by={(entry) => entry.kind}>
        {(entry) => (
          <idp-kind-card
            title={entry().title}
            text={entry().text}
            icon={entry().icon}
            selected={p.selected() === entry().kind}
            onChoose={() => p.choose(entry().kind)}
          />
        )}
      </For>
    </div>
  </section>
);

export const KindPickerView = viewToken<KindPickerLogic>('idp-kind-picker', kindPickerView);
