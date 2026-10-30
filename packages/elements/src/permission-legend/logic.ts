/** What each scope state looks like, as a row of samples; apart from the look. */
import type { ScopeState } from '../permissions/logic.js';
import type { Tone } from '../tone.js';

/** Each state's tone, shared by the legend and the cards so they always agree. */
export const STATE_TONE: Record<ScopeState, Tone> = {
  live: 'success',
  waiting: 'warning',
  sandbox: 'info',
  added: 'primary',
  available: 'neutral',
  restricted: 'danger',
};

export interface PermissionLegendLogic {
  entries: () => { state: ScopeState; label: string }[];
  label: () => string;
}
