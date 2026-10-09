/** The catalogue as a table, one row per scope, filtered by sensitivity; apart from the look. */
import type { ScopeEntry, Sensitivity } from '@idp/sdk/types';
import type { SegmentedOption } from '../segmented/logic.js';
import type { ScopeRowLabels } from '../scope-row/logic.js';

export interface ScopeListLabels {
  title: string;
  scope: string;
  description: string;
  api: string;
  sensitivity: string;
  /** The filter's first choice. */
  all: string;
  sensitivities: Record<Sensitivity, string>;
  empty: string;
}

export const scopeListLabels: ScopeListLabels = {
  title: 'Scopes',
  scope: 'Scope',
  description: 'Consent text',
  api: 'API',
  sensitivity: 'Sensitivity',
  all: 'All',
  sensitivities: { public: 'Public', sensitive: 'Sensitive', restricted: 'Restricted' },
  empty: 'No scope yet.',
};

export interface ScopeListLogic {
  labels: () => ScopeListLabels;
  /** The scopes the filter lets through. */
  scopes: () => ScopeEntry[];
  filters: () => SegmentedOption[];
  filter: () => string;
  choose: (value: string) => void;
  locale: () => string;
  rowLabels: () => Partial<ScopeRowLabels>;
}
