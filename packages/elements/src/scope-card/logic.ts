/** One scope an app may ask for, as a selectable card; apart from the look. */
import type { ScopeState } from '../permissions/logic.js';

export interface ScopeCardLogic {
  name: () => string;
  text: () => string;
  state: () => ScopeState;
  stateLabel: () => string;
  selected: () => boolean;
  locked: () => boolean;
  toggle: () => void;
}

export interface ScopeCardEvents {
  toggle: Record<string, never>;
}
