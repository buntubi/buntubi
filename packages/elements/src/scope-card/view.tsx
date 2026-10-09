/** The default look: a selectable card, the tick and the scope's name, its state on the right. */
import { Toggle } from '@fluixi-ui/toggle';
import { viewToken } from '../view.js';
import { STATE_TONE } from '../permission-legend/logic.js';
import type { ScopeCardLogic } from './logic.js';

const CHECK = 'M5 12.5l4.5 4.5L19 7.5';

export const scopeCardView = (c: ScopeCardLogic) => (
  <Toggle part="scope" data-choice="card" class="scope" pressed={c.selected()} disabled={c.locked()} onChange={() => c.toggle()}>
    <style scoped>{`
      .scope { height: 100%; box-sizing: border-box; padding: 16px; }
      .body { display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: 6px 12px; }
      .top { display: flex; align-items: center; gap: 8px; min-width: 0; }
      code { flex: 1; min-width: 0; font-size: 13px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; }
      .badge { flex: none; padding: 1px 8px; border-radius: 999px; font-size: 11.5px; font-weight: 500; color: var(--tone); background: color-mix(in srgb, var(--tone) 13%, transparent); }
      .text { grid-column: 2; color: var(--idp-muted); font-size: 13px; }
    `}</style>
    <span class="body">
      <span data-tick="" aria-hidden="true">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <path d={CHECK} />
        </svg>
      </span>
      <span class="top">
        <code>{() => c.name()}</code>
        <span class="badge" style={() => `--tone: ${STATE_TONE[c.state()]}`}>
          {() => c.stateLabel()}
        </span>
      </span>
      <span class="text">{() => c.text()}</span>
    </span>
  </Toggle>
);

export const ScopeCardView = viewToken<ScopeCardLogic>('ScopeCardView', scopeCardView);
