/** An app's basic information, apart from how the form looks. */
import type { ReactiveForm } from '@fluixi-ui/form';
import type { FieldControl } from '../field.js';
import type { AppSettingsInput } from '@buntubi/sdk/schemas/apps';

export type SettingsField = 'name' | 'description' | 'homepage_url' | 'privacy_url' | 'terms_url' | 'logo';

export const SETTINGS_FIELDS: SettingsField[] = ['name', 'description', 'homepage_url', 'privacy_url', 'terms_url', 'logo'];

export interface AppSettingsLabels {
  title: string;
  intro: string;
  fields: Record<SettingsField, string>;
  hints: Partial<Record<SettingsField, string>>;
  save: string;
  saved: string;
  error: string;
}

export const appSettingsLabels: AppSettingsLabels = {
  title: 'Basic information',
  intro: 'What people see on the consent screen, and what a review checks before the app goes live.',
  fields: {
    name: 'App name',
    description: 'Description',
    homepage_url: 'Homepage',
    privacy_url: 'Privacy policy',
    terms_url: 'Terms of service',
    logo: 'Logo URL',
  },
  hints: {
    description: 'One or two sentences on what the app does.',
    logo: 'A square image over https, shown on the consent screen.',
  },
  save: 'Save',
  saved: 'Saved',
  error: 'Something went wrong. Try again.',
};

/** The form engine's root, typed per field. */
export interface AppSettingsForm extends ReactiveForm<AppSettingsInput> {
  get<K extends keyof AppSettingsInput>(key: K): FieldControl<AppSettingsInput[K]>;
}

export interface AppSettingsLogic {
  labels: () => AppSettingsLabels;
  fields: () => SettingsField[];
  form: AppSettingsForm;
  changed: () => boolean;
  canEdit: () => boolean;
  save: (values: AppSettingsInput) => Promise<void>;
  busy: () => boolean;
  saved: () => boolean;
  error: () => string | null;
}
