/** One app that uses the account; apart from the look. */
export interface ConnectedAppLabels {
  /** {brand} app. */
  platform: string;
  /** {date} access was given. */
  since: string;
  /** {date} it was last used. */
  lastUsed: string;
  neverUsed: string;
  remove: string;
  cancel: string;
  /** {name} of the app. */
  confirm: string;
  removeNow: string;
  error: string;
}

export const connectedAppLabels: ConnectedAppLabels = {
  platform: '{brand} app',
  since: 'access since {date}',
  lastUsed: 'last used {date}',
  neverUsed: 'not used yet',
  remove: 'Remove access',
  cancel: 'Cancel',
  confirm: '{name} loses access now and signs you out. Its own data about you stays with it.',
  removeNow: 'Remove access',
  error: 'Something went wrong. Try again.',
};

export interface ConnectedAppLogic {
  labels: () => ConnectedAppLabels;
  name: () => string;
  logo: () => string;
  initial: () => string;
  platform: () => string;
  detail: () => string;
  scopes: () => string[];
  confirming: () => boolean;
  toggle: () => void;
  remove: () => Promise<void>;
  busy: () => boolean;
  error: () => string | null;
}
