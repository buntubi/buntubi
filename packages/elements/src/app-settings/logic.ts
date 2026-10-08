/** An app's basic information, apart from how the form looks. */

export type SettingsField = 'name' | 'description' | 'homepage_url' | 'privacy_url' | 'terms_url' | 'logo';

export const SETTINGS_FIELDS: SettingsField[] = ['name', 'description', 'homepage_url', 'privacy_url', 'terms_url', 'logo'];

export interface AppSettingsLabels {
  title: string;
  intro: string;
  fields: Record<SettingsField, string>;
  hints: Partial<Record<SettingsField, string>>;
  save: string;
  saved: string;
  nameRequired: string;
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
  nameRequired: 'The app needs a name.',
  error: 'Something went wrong. Try again.',
};

export interface AppSettingsLogic {
  labels: () => AppSettingsLabels;
  fields: () => SettingsField[];
  value: (field: SettingsField) => string;
  edit: (field: SettingsField, value: string) => void;
  changed: () => boolean;
  canEdit: () => boolean;
  save: () => Promise<void>;
  busy: () => boolean;
  saved: () => boolean;
  error: () => string | null;
}
