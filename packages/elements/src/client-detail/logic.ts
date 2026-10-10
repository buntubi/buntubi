/** One app for the platform owner: whose it is, how it signs people in, and what the console decides for it. */
import type { AdminClient } from '@idp/sdk/types';

export interface ClientDetailLabels {
  overview: string;
  organization: string;
  platform: string;
  environment: string;
  live: string;
  sandbox: string;
  review: string;
  reviews: Record<string, string>;
  type: string;
  confidential: string;
  public: string;
  clientId: string;
  created: string;
  signIn: string;
  redirects: string;
  noRedirects: string;
  permissions: string;
  firstParty: string;
  firstPartyHelp: string;
  notPlatform: string;
  access: string;
  disabledHelp: string;
  enabledHelp: string;
  disable: string;
  enable: string;
  openInPortal: string;
  portalHelp: string;
  error: string;
}

export const clientDetailLabels: ClientDetailLabels = {
  overview: 'Overview',
  organization: 'Organization',
  platform: 'Platform',
  environment: 'Environment',
  live: 'Live',
  sandbox: 'Sandbox',
  review: 'Review',
  reviews: { none: 'Not needed', pending: 'Waiting', approved: 'Approved', rejected: 'Changes requested' },
  type: 'Type',
  confidential: 'Confidential (server)',
  public: 'Public (browser, mobile)',
  clientId: 'Client ID',
  created: 'Created',
  signIn: 'Sign-in',
  redirects: 'Redirect URIs',
  noRedirects: 'None yet.',
  permissions: 'Permissions',
  firstParty: 'First-party',
  firstPartyHelp: 'Signs people in without asking for consent, and is listed on their account page. For the platform’s own apps only.',
  notPlatform: 'This app belongs to a developer’s organization: it always asks for consent.',
  access: 'Access',
  disabledHelp: 'Disabled: it gets no new tokens.',
  enabledHelp: 'Disabling it stops new sign-ins and token renewals at once.',
  disable: 'Disable app',
  enable: 'Enable app',
  openInPortal: 'Open in the developer portal',
  portalHelp: 'Redirects, permissions, brand and secrets are edited in the portal, by the organization’s members.',
  error: 'Something went wrong. Try again.',
};

export interface ClientDetailLogic {
  labels: () => ClientDetailLabels;
  client: () => AdminClient | null;
  scopes: () => string[];
  created: () => string;
  /** The app's page in the developer portal, when the console knows where the portal is. */
  portalHref: () => string;
  setFirstParty: (on: boolean) => Promise<void>;
  toggleDisabled: () => Promise<void>;
  busy: () => boolean;
  error: () => string | null;
}
