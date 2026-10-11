/** Adding a scope to the catalogue; apart from the look. */
import type { ReactiveForm } from '@fluixi-ui/form';
import type { FieldControl } from '../field.js';
import type { ScopeInput } from '@idp/sdk/schemas/catalogue';
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

/** The form's values: the engine widens a field to `string`, so the sensitivity is narrowed at submit. */
export type ScopeValues = Omit<ScopeInput, 'sensitivity'> & { sensitivity: string };

/** The form engine's root, typed per field. */
export interface ScopeForm extends ReactiveForm<ScopeValues> {
  get<K extends keyof ScopeValues>(key: K): FieldControl<ScopeValues[K]>;
}

export interface ScopeFormLogic {
  labels: () => ScopeFormLabels;
  form: ScopeForm;
  create: (values: ScopeValues) => Promise<void>;
  busy: () => boolean;
  error: () => string | null;
}

export interface ScopeFormEvents {
  /** The scope is in the catalogue. */
  created: { name: string };
}
