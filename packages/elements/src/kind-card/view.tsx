/** The default look: a selectable card with the icon in a tinted tile over the name and text. */
import { Toggle } from '@fluixi-ui/toggle';
import { viewToken } from '../view.js';
import type { KindCardLogic } from './logic.js';

export const kindCardView = (k: KindCardLogic) => (
  <Toggle part="kind" data-choice="card" class="kind" pressed={k.selected()} onChange={() => k.choose()}>
    <style scoped>{`
      .kind { height: 100%; box-sizing: border-box; }
      .body { display: grid; gap: 6px; justify-items: start; }
      .icon { width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; margin-bottom: 4px; color: var(--idp-accent-ink); background: color-mix(in srgb, var(--idp-accent) 10%, transparent); }
      .title { font-weight: 600; }
      .text { color: var(--idp-muted); font-size: 13px; line-height: 1.5; }
    `}</style>
    <span class="body">
      <span class="icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d={k.icon()} />
        </svg>
      </span>
      <span class="title">{() => k.title()}</span>
      <span class="text">{() => k.text()}</span>
    </span>
  </Toggle>
);

export const KindCardView = viewToken<KindCardLogic>('idp-kind-card', kindCardView);
