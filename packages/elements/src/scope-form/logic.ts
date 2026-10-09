/** Adding a scope to the catalogue; apart from the look. */
import type { Sensitivity } from '@idp/sdk/types';

export interface ScopeFormLabels {
  title: string;
  name: string;
  sensitivity: string;
  sensitivities: Record<Sensitivity, string>;
  resource: string;
  fr: string;
  en: string;
  create: string;
  error: string;
}

export const scopeFormLabels: ScopeFormLabels = {
  title: 'New scope',
  name: 'Name',
  sensitivity: 'Sensitivity',
  sensitivities: { public: 'Public', sensitive: 'Sensitive', restricted: 'Restricted' },
  resource: 'API it belongs to',
  fr: 'What consent says, in French',
  en: 'What consent says, in English',
  create: 'Add the scope',
  error: 'Something went wrong. Try again.',
};

export const SENSITIVITIES: Sensitivity[] = ['public', 'sensitive', 'restricted'];

export interface ScopeDraft {
  name: string;
  sensitivity: Sensitivity;
  resource: string;
  fr: string;
  en: string;
}

export interface ScopeFormLogic {
  labels: () => ScopeFormLabels;
  draft: () => ScopeDraft;
  edit: <K extends keyof ScopeDraft>(key: K, value: ScopeDraft[K]) => void;
  canCreate: () => boolean;
  create: () => Promise<void>;
  error: () => string | null;
}

export interface ScopeFormEvents {
  /** The scope is in the catalogue. */
  created: { name: string };
}
