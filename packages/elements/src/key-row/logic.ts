/** One API key as a row; apart from the look. */

export interface KeyRowLogic {
  name: () => string;
  meta: () => string;
  prefix: () => string;
  revokeLabel: () => string;
  canRevoke: () => boolean;
  busy: () => boolean;
  revoke: () => void;
}

export interface KeyRowEvents {
  revoke: Record<string, never>;
}
