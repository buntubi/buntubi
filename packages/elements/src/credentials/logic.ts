/** An app's credentials, apart from how they look: client, secrets, redirect URIs, API keys. */
import type { ApiKey, Environment, Secret } from '@idp/sdk/types';

export interface CredentialsLabels {
  title: string;
  intro: Record<Environment, string>;
  environments: Record<Environment, string>;
  client: string;
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
  revoked: string;
  secretOnce: string;
  rotationNote: string;
  noSecret: string;
  redirects: string;
  redirectsHint: string;
  addRedirect: string;
  remove: string;
  save: string;
  invalidUri: string;
  keys: string;
  keysHint: string;
  noKeys: string;
  keyName: string;
  keyScopes: string;
  createKey: string;
  keyOnce: string;
  signing: string;
  signingText: string;
  error: string;
}

export const credentialsLabels: CredentialsLabels = {
  title: 'Credentials',
  intro: {
    sandbox: 'Sandbox credentials work for you, your team and your test users.',
    live: 'Production credentials work for everyone once the app is live. Keep them on a server.',
  },
  environments: { sandbox: 'Sandbox', live: 'Production' },
  client: 'OAuth client',
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
  revoked: 'Revoked',
  secretOnce: 'Copy this secret now: it will not be shown again.',
  rotationNote: 'A new secret is shown once. The previous one keeps working for a grace period.',
  noSecret: 'No secret yet.',
  redirects: 'Redirect URIs',
  redirectsHint: 'Where the provider may send people back after sign-in. Exact match, https except localhost.',
  addRedirect: 'Add',
  remove: 'Remove',
  save: 'Save',
  invalidUri: 'Enter a full address starting with https:// (or http://localhost).',
  keys: 'API keys',
  keysHint: 'For calls from your servers to platform APIs. Shared by the organization.',
  noKeys: 'No key in this environment.',
  keyName: 'Key name',
  keyScopes: 'Scopes (space separated)',
  createKey: 'Create key',
  keyOnce: 'Copy this key now: it will not be shown again.',
  signing: 'Signing keys',
  signingText: 'Tokens are signed with RS256. Verify them with the published key set; the key ID is in each token header.',
  error: 'Something went wrong. Try again.',
};

export interface CredentialsLogic {
  labels: () => CredentialsLabels;
  environment: () => Environment;
  environments: () => { value: Environment; current: boolean; choose: () => void }[];
  clientId: () => string;
  confidential: () => boolean;
  copied: () => boolean;
  copy: () => void;
  secrets: () => Secret[];
  /** A secret or key just made, shown once. */
  fresh: () => { value: string; note: string } | null;
  rotate: () => Promise<void>;
  revokeSecret: (id: string) => Promise<void>;
  redirects: () => string[];
  redirectDraft: () => string;
  editRedirect: (value: string) => void;
  addRedirect: () => void;
  removeRedirect: (uri: string) => void;
  redirectsChanged: () => boolean;
  saveRedirects: () => Promise<void>;
  keys: () => ApiKey[];
  keyName: () => string;
  keyScopes: () => string;
  editKey: (field: 'name' | 'scopes', value: string) => void;
  createKey: () => Promise<void>;
  revokeKey: (id: string) => Promise<void>;
  jwksUrl: () => string;
  canManage: () => boolean;
  date: (iso: string | null) => string;
  busy: () => string | null;
  error: () => string | null;
}

/** An address the provider accepts as a redirect: https, or http on this machine. */
export function isRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    return !url.hash && (url.protocol === 'https:' || (url.protocol === 'http:' && local) || /^[a-z][a-z0-9+.-]*\.[a-z]/.test(url.protocol));
  } catch {
    return false;
  }
}
