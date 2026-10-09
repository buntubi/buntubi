/** The default look: a table row; name, consent text, API, sensitivity. */
import { viewToken } from '../view.js';
import type { ScopeRowLogic } from './logic.js';

export const scopeRowView = (r: ScopeRowLogic) => (
  <div part="scope" class="scope" role="row">
    <style scoped>{`
      .scope { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr) 120px 110px; gap: 12px; align-items: center; padding: 11px 20px; border-top: 1px solid var(--idp-border); font-size: 13.5px; }
      code { font-family: var(--idp-mono); font-size: 12.5px; overflow: hidden; text-overflow: ellipsis; }
      .muted { color: var(--idp-muted); font-size: 13px; }
      .dot { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; }
      .dot::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
      .dot[data-level='public'] { color: var(--idp-ok); }
      .dot[data-level='sensitive'] { color: var(--idp-warn); }
      .dot[data-level='restricted'] { color: var(--idp-bad); }
      @media (max-width: 860px) { .scope { grid-template-columns: minmax(0, 1fr) auto; } .muted { grid-column: 1; } }
    `}</style>
    <span role="cell">
      <code>{() => r.name()}</code>
    </span>
    <span role="cell" class="muted">{() => r.description()}</span>
    <span role="cell" class="muted">{() => r.resource() || r.labels().signIn}</span>
    <span role="cell">
      <span class="dot" data-level={() => r.sensitivity()}>
        {() => r.labels().sensitivities[r.sensitivity()]}
      </span>
    </span>
  </div>
);

export const ScopeRowView = viewToken<ScopeRowLogic>('ScopeRowView', scopeRowView);
