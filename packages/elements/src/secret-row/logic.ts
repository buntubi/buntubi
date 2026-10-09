/** One client secret as a table row; apart from the look. */

export interface SecretRowLogic {
  prefix: () => string;
  created: () => string;
  lastUsed: () => string;
  expires: () => string;
  revokeLabel: () => string;
  canRevoke: () => boolean;
  busy: () => boolean;
  revoke: () => void;
}

export interface SecretRowEvents {
  revoke: Record<string, never>;
}
