/** One scope of the catalogue as a line; apart from the look. */
import type { Sensitivity } from '@buntu/sdk/types';

export interface ScopeRowLabels {
  /** In place of an API: a scope of sign-in itself. */
  signIn: string;
  sensitivities: Record<Sensitivity, string>;
}

export const scopeRowLabels: ScopeRowLabels = {
  signIn: 'Sign-in',
  sensitivities: { public: 'Public', sensitive: 'Sensitive', restricted: 'Restricted' },
};

export interface ScopeRowLogic {
  labels: () => ScopeRowLabels;
  name: () => string;
  description: () => string;
  resource: () => string;
  sensitivity: () => Sensitivity;
}
