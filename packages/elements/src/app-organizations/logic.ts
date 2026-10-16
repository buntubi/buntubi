/** Whether an app's tokens name an organization, apart from how the card looks. */
import { ORGANIZATION_USAGES, type OrganizationUsage } from '@buntubi/sdk/types';

/** The choices, in the order the card offers them. */
export const USAGES = ORGANIZATION_USAGES;

export interface AppOrganizationsLabels {
  title: string;
  intro: string;
  /** The select's accessible name. */
  usage: string;
  choices: Record<OrganizationUsage, { name: string; text: string }>;
  saved: string;
  error: string;
}

export const appOrganizationsLabels: AppOrganizationsLabels = {
  title: 'Organizations',
  intro: 'Whether the tokens this app receives name the organization the person works in.',
  usage: 'Organization in tokens',
  choices: {
    none: { name: 'Never', text: 'Tokens name the person only.' },
    optional: {
      name: 'When the app asks',
      text: 'The authorization request may add organization=<id>; tokens then carry org_id and org_role.',
    },
    required: {
      name: 'Always',
      text: 'Without organization=<id>, the person picks one of theirs at sign-in.',
    },
  },
  saved: 'Saved',
  error: 'Something went wrong. Try again.',
};

export interface AppOrganizationsLogic {
  labels: () => AppOrganizationsLabels;
  usage: () => OrganizationUsage;
  canEdit: () => boolean;
  choose: (usage: OrganizationUsage) => void;
  busy: () => boolean;
  saved: () => boolean;
  error: () => string | null;
}
