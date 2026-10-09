/** The catalogue, one row per scope; apart from the look. */
import type { ScopeEntry } from '@idp/sdk/types';
import type { ScopeRowLabels } from '../scope-row/logic.js';

export interface ScopeListLogic {
  title: () => string;
  empty: () => string;
  scopes: () => ScopeEntry[];
  locale: () => string;
  rowLabels: () => Partial<ScopeRowLabels>;
}
