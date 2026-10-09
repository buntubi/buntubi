/** One scope of the catalogue as a line; apart from the look. */
import type { Sensitivity } from '@idp/sdk/types';

export interface ScopeRowLabels {
  api: string;
  sensitivities: Record<Sensitivity, string>;
}

export const scopeRowLabels: ScopeRowLabels = {
  api: 'API',
  sensitivities: { public: 'Public', sensitive: 'Sensitive', restricted: 'Restricted' },
};

export interface ScopeRowLogic {
  labels: () => ScopeRowLabels;
  name: () => string;
  description: () => string;
  resource: () => string;
  sensitivity: () => Sensitivity;
}
