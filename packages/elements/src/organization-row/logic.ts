/** One organization for the platform owner: what it is, and suspending or restoring it. */
import type { AdminOrganization } from '@idp/sdk/types';

export interface OrganizationCardLabels {
  owner: string;
  members: string;
  apps: string;
  approved: string;
  suspended: string;
  reason: string;
  suspend: string;
  restore: string;
  error: string;
}

export const organizationCardLabels: OrganizationCardLabels = {
  owner: 'Owner',
  members: 'members',
  apps: 'apps',
  approved: 'Approved scopes',
  suspended: 'Suspended',
  reason: 'Reason for suspending',
  suspend: 'Suspend',
  restore: 'Restore',
  error: 'Something went wrong. Try again.',
};

export interface OrganizationCardLogic {
  labels: () => OrganizationCardLabels;
  organization: () => AdminOrganization | null;
  summary: () => string;
  reason: () => string;
  editReason: (value: string) => void;
  canSuspend: () => boolean;
  suspend: () => Promise<void>;
  restore: () => Promise<void>;
  busy: () => boolean;
  error: () => string | null;
}
