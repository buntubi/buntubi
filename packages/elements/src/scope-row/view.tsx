/** The default look: name and texts on the left, the sensitivity on the right. */
import { Show } from '@fluixi/core';
import { viewToken } from '../view.js';
import type { ScopeRowLogic } from './logic.js';

export const scopeRowView = (r: ScopeRowLogic) => (
  <div part="scope" class="scope">
    <style scoped>{`
      .scope { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 10px 0; }
      .text { display: grid; gap: 2px; min-width: 0; }
      code { font-family: var(--idp-mono); font-size: 12.5px; }
      .muted { color: var(--idp-muted); font-size: 12.5px; }
      .tag { padding: 1px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 500; }
      .tag[data-level='public'] { color: var(--idp-ok); background: color-mix(in srgb, var(--idp-ok) 12%, transparent); }
      .tag[data-level='sensitive'] { color: var(--idp-warn); background: color-mix(in srgb, var(--idp-warn) 12%, transparent); }
      .tag[data-level='restricted'] { color: var(--idp-bad); background: color-mix(in srgb, var(--idp-bad) 12%, transparent); }
    `}</style>
    <span class="text">
      <code>{() => r.name()}</code>
      <span class="muted">{() => r.description()}</span>
      <Show when={r.resource()}>
        <span class="muted">{() => `${r.labels().api} ${r.resource()}`}</span>
      </Show>
    </span>
    <span class="tag" data-level={() => r.sensitivity()}>
      {() => r.labels().sensitivities[r.sensitivity()]}
    </span>
  </div>
);

export const ScopeRowView = viewToken<ScopeRowLogic>('ScopeRowView', scopeRowView);
