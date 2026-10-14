/** The default look: a card with a heading and one attention item per entry. */
import { For, Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { NeedsAttentionLogic } from './logic.js';

export const needsAttentionView = (n: NeedsAttentionLogic) => (
  <section part="attention" class="card" aria-labelledby="idp-attention-title">
    <style scoped>{`
      .card { border: 1px solid var(--idp-border); border-radius: var(--idp-radius); background: var(--idp-surface); box-shadow: var(--idp-shadow); padding: 18px 10px 10px; display: grid; gap: 6px; align-content: start; }
      h2 { margin: 0; padding: 0 10px 4px; font-size: 15px; font-weight: 600; }
      .empty { margin: 0; padding: 4px 10px 10px; color: var(--idp-muted); font-size: 13px; }
      .card > :deep(idp-attention-item) { display: block; }
    `}</style>
    <h2 id="idp-attention-title">{() => n.labels().title}</h2>
    <Show when={n.items().length} fallback={<p class="empty">{() => n.labels().empty}</p>}>
      <For each={n.items()} by={(item) => item.key}>
        {(item) => <idp-attention-item title={item().title} text={item().text} href={item().href} tone={item().tone} />}
      </For>
    </Show>
  </section>
);

export const NeedsAttentionView = viewToken<NeedsAttentionLogic>('idp-needs-attention', needsAttentionView);
