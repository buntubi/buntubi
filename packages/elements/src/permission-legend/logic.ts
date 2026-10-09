/** What each scope state looks like, as a row of samples; apart from the look. */
import type { ScopeState } from '../permissions/logic.js';

/** Each state's colour, shared by the legend and the cards so they always agree. */
export const STATE_TONE: Record<ScopeState, string> = {
  live: 'var(--idp-ok)',
  waiting: 'var(--idp-warn)',
  sandbox: 'var(--idp-info)',
  added: 'var(--idp-accent-ink)',
  available: 'var(--idp-muted)',
  restricted: 'var(--idp-bad)',
};

export interface PermissionLegendLogic {
  entries: () => { state: ScopeState; label: string }[];
  label: () => string;
}
