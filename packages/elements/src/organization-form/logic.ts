/** Creating an organization; apart from the look. */
import type { ReactiveForm } from '@fluixi-ui/form';
import type { FieldControl } from '../field.js';
import type { OrganizationInput } from '@buntu/sdk/schemas/organizations';

export interface OrganizationFormLabels {
  title: string;
  name: string;
  supportEmail: string;
  create: string;
  error: string;
}

export const organizationFormLabels: OrganizationFormLabels = {
  title: 'New organization',
  name: 'Name',
  supportEmail: 'Support email',
  create: 'Create',
  error: 'Something went wrong. Try again.',
};

export type OrganizationFormValues = Pick<OrganizationInput, 'name' | 'support_email'>;

/** The form engine's root, typed per field. */
export interface OrganizationForm extends ReactiveForm<OrganizationFormValues> {
  get<K extends keyof OrganizationFormValues>(key: K): FieldControl<OrganizationFormValues[K]>;
}

export interface OrganizationFormLogic {
  labels: () => OrganizationFormLabels;
  form: OrganizationForm;
  create: (values: OrganizationFormValues) => Promise<void>;
  busy: () => boolean;
  error: () => string | null;
}

export interface OrganizationFormEvents {
  /** The organization exists; the host opens it. */
  created: { id: string };
}
