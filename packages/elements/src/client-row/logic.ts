/** One app for the platform owner: whose it is, where it runs, and whether it skips consent. */
import type { AdminClient } from '@buntu/sdk/types';

export interface ClientRowLabels {
  platform: string;
  live: string;
  sandbox: string;
  disabled: string;
  firstParty: string;
  /** Why the switch is off limits on someone else's app. */
  notPlatform: string;
  error: string;
}

export const clientRowLabels: ClientRowLabels = {
  platform: 'Platform',
  live: 'Live',
  sandbox: 'Sandbox',
  disabled: 'Disabled',
  firstParty: 'First-party',
  notPlatform: 'Only the platform’s own apps can be first-party.',
  error: 'Something went wrong. Try again.',
};

export interface ClientRowLogic {
  labels: () => ClientRowLabels;
  client: () => AdminClient | null;
  href: () => string;
  setFirstParty: (on: boolean) => Promise<void>;
  busy: () => boolean;
  error: () => string | null;
}
