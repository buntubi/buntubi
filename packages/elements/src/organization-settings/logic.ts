/** An organization's settings and its deletion, apart from how they look. */
import type { ReactiveForm } from '@fluixi-ui/form';
import type { FieldControl } from '../field.js';
import type { OrganizationInput } from '@buntu/sdk/schemas/organizations';

export type OrganizationField = 'name' | 'description' | 'support_email';
export const ORGANIZATION_FIELDS: OrganizationField[] = ['name', 'support_email', 'description'];

export interface OrganizationSettingsLabels {
  title: string;
  intro: string;
  fields: Record<OrganizationField, string>;
  hints: Partial<Record<OrganizationField, string>>;
  save: string;
  saved: string;
  danger: string;
  dangerText: string;
  /** "Type {name} to confirm". */
  confirm: string;
  delete: string;
  error: string;
}

export const organizationSettingsLabels: OrganizationSettingsLabels = {
  title: 'Organization',
  intro: 'How the organization appears to the people who sign in to its apps.',
  fields: { name: 'Name', description: 'Description', support_email: 'Support email' },
  hints: { support_email: 'Shown on consent screens; required before an app goes live.' },
  save: 'Save',
  saved: 'Saved',
  danger: 'Delete the organization',
  dangerText: 'Deletes its apps, keys, members and test users. People signed in to its apps lose access. This cannot be undone.',
  confirm: 'Type {name} to confirm',
  delete: 'Delete organization',
  error: 'Something went wrong. Try again.',
};

/** The form engine's root, typed per field. */
export interface OrganizationSettingsForm extends ReactiveForm<OrganizationInput> {
  get<K extends keyof OrganizationInput>(key: K): FieldControl<OrganizationInput[K]>;
}

export interface OrganizationSettingsLogic {
  labels: () => OrganizationSettingsLabels;
  fields: () => OrganizationField[];
  form: OrganizationSettingsForm;
  changed: () => boolean;
  canEdit: () => boolean;
  save: (values: OrganizationInput) => Promise<void>;
  saved: () => boolean;
  canDelete: () => boolean;
  name: () => string;
  confirmation: () => string;
  confirm: (value: string) => void;
  /** Whether the typed name matches, so deleting is allowed. */
  confirmed: () => boolean;
  remove: () => Promise<void>;
  busy: () => string | null;
  error: () => string | null;
}

export interface OrganizationSettingsEvents {
  /** The organization is gone; the host leaves its pages. */
  deleted: { id: string };
}
