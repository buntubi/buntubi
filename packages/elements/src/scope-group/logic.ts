/** One API product's scopes, under the product's name; apart from the look. */
import type { ScopeCard } from '../permissions/logic.js';

export interface ScopeGroupLogic {
  name: () => string;
  scopes: () => ScopeCard[];
  stateLabel: (scope: ScopeCard) => string;
  detailsHref: () => string;
  detailsLabel: () => string;
  toggle: (scope: string) => void;
}

export interface ScopeGroupEvents {
  toggle: { scope: string };
}
