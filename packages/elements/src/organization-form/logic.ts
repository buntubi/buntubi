/** Creating an organization; apart from the look. */

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

export interface OrganizationFormLogic {
  labels: () => OrganizationFormLabels;
  name: () => string;
  supportEmail: () => string;
  editName: (value: string) => void;
  editSupportEmail: (value: string) => void;
  canCreate: () => boolean;
  create: () => Promise<void>;
  error: () => string | null;
}

export interface OrganizationFormEvents {
  /** The organization exists; the host opens it. */
  created: { id: string };
}
