/** An organization's API keys in one environment, and making one; apart from the look. */
import type { ApiKey } from '@idp/sdk/types';

export interface ApiKeysLabels {
  title: string;
  intro: string;
  empty: string;
  create: string;
  cancel: string;
  name: string;
  scopes: string;
  /** What a key with no scope listed may call: "All {environment} scopes". */
  allScopes: string;
  created: string;
  keyOnce: string;
  copy: string;
  copied: string;
  revoke: string;
  error: string;
}

export const apiKeysLabels: ApiKeysLabels = {
  title: 'API keys',
  intro: 'For calls from your servers to platform APIs. Shared by the organization.',
  empty: 'No key in this environment.',
  create: 'Create key',
  cancel: 'Cancel',
  name: 'Key name',
  scopes: 'Scopes (space separated)',
  allScopes: 'All {environment} scopes',
  created: 'created {date}',
  keyOnce: 'Copy this key now: it will not be shown again.',
  copy: 'Copy',
  copied: 'Copied',
  revoke: 'Revoke',
  error: 'Something went wrong. Try again.',
};

export interface ApiKeysLogic {
  labels: () => ApiKeysLabels;
  keys: () => ApiKey[];
  meta: (key: ApiKey) => string;
  canManage: () => boolean;
  creating: () => boolean;
  open: () => void;
  close: () => void;
  name: () => string;
  scopes: () => string;
  edit: (field: 'name' | 'scopes', value: string) => void;
  create: () => Promise<void>;
  revoke: (id: string) => Promise<void>;
  fresh: () => string;
  busy: () => string | null;
  error: () => string | null;
}
