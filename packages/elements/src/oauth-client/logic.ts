/** An app's OAuth client: its ID, its secrets and where it may send people back; apart from the look. */
import type { Secret } from '@buntubi/sdk/types';

export interface OAuthClientLabels {
  title: string;
  clientId: string;
  copy: string;
  copied: string;
  publicClient: string;
  secret: string;
  created: string;
  lastUsed: string;
  expires: string;
  never: string;
  rotate: string;
  revoke: string;
  secretOnce: string;
  rotationNote: string;
  noSecret: string;
  redirects: string;
  noRedirects: string;
  manageRedirects: string;
  error: string;
}

export const oauthClientLabels: OAuthClientLabels = {
  title: 'OAuth client',
  clientId: 'Client ID',
  copy: 'Copy',
  copied: 'Copied',
  publicClient: 'A public client (browser or mobile) has no secret: it proves itself with PKCE.',
  secret: 'Client secret',
  created: 'Created',
  lastUsed: 'Last used',
  expires: 'Expires',
  never: 'Never',
  rotate: 'Rotate secret',
  revoke: 'Revoke',
  secretOnce: 'Copy this secret now: it will not be shown again.',
  rotationNote: 'A new secret is shown once. The previous one keeps working for a grace period.',
  noSecret: 'No secret yet.',
  redirects: 'Redirect URIs',
  noRedirects: 'None yet: people cannot sign in until one is added.',
  manageRedirects: 'Manage',
  error: 'Something went wrong. Try again.',
};

export interface OAuthClientLogic {
  labels: () => OAuthClientLabels;
  clientId: () => string;
  confidential: () => boolean;
  copyLabel: () => string;
  copy: () => void;
  secrets: () => Secret[];
  date: (iso: string | null) => string;
  fresh: () => string;
  redirects: () => string[];
  redirectsHref: () => string;
  canManage: () => boolean;
  rotate: () => Promise<void>;
  revoke: (id: string) => Promise<void>;
  busy: () => string | null;
  error: () => string | null;
}
