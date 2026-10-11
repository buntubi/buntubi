/** One organization for the platform owner: what it is, and suspending or restoring it. */
import type { ReactiveForm } from '@fluixi-ui/form';
import type { FieldControl } from '../field.js';
import type { SuspendInput } from '@idp/sdk/schemas/organizations';
import type { AdminOrganization } from '@idp/sdk/types';

export interface OrganizationRowLabels {
  platform: string;
  /** Why the platform's organization has no suspend action. */
  platformHelp: string;
  approved: string;
  none: string;
  active: string;
  suspended: string;
  reason: string;
  suspend: string;
  confirm: string;
  cancel: string;
  restore: string;
  error: string;
}

export const organizationRowLabels: OrganizationRowLabels = {
  platform: 'Platform',
  platformHelp: 'The platform’s own apps; its members are the admins.',
  approved: 'Approved scopes',
  none: 'None',
  active: 'Active',
  suspended: 'Suspended',
  reason: 'Reason for suspending',
  suspend: 'Suspend',
  confirm: 'Suspend the organization',
  cancel: 'Cancel',
  restore: 'Restore',
  error: 'Something went wrong. Try again.',
};

/** The form engine's root, typed per field. */
export interface SuspendForm extends ReactiveForm<SuspendInput> {
  get<K extends keyof SuspendInput>(key: K): FieldControl<SuspendInput[K]>;
}

export interface OrganizationRowLogic {
  labels: () => OrganizationRowLabels;
  organization: () => AdminOrganization | null;
  /** The organization's apps in the console. */
  appsHref: () => string;
  initials: () => string;
  /** The reason editor is open. */
  suspending: () => boolean;
  openSuspend: (open: boolean) => void;
  form: SuspendForm;
  suspend: (values: SuspendInput) => Promise<void>;
  restore: () => Promise<void>;
  busy: () => boolean;
  error: () => string | null;
}
