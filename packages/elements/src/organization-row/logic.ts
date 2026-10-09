/** One organization for the platform owner: what it is, and suspending or restoring it. */
import type { AdminOrganization } from '@idp/sdk/types';

export interface OrganizationRowLabels {
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

export interface OrganizationRowLogic {
  labels: () => OrganizationRowLabels;
  organization: () => AdminOrganization | null;
  initials: () => string;
  /** The reason editor is open. */
  suspending: () => boolean;
  openSuspend: (open: boolean) => void;
  reason: () => string;
  editReason: (value: string) => void;
  canSuspend: () => boolean;
  suspend: () => Promise<void>;
  restore: () => Promise<void>;
  busy: () => boolean;
  error: () => string | null;
}
