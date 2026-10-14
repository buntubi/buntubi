/** The connected apps page's list: a row each, and a word on the platform's own apps. */
import type { ConnectedApp } from '@buntubi/sdk/account';
import type { ConnectedAppLabels } from '../connected-app/logic.js';

export interface ConnectedAppsLabels {
  title: string;
  empty: string;
  /** {brand}: why its apps cannot be removed here. */
  platformNote: string;
  app: Partial<ConnectedAppLabels>;
}

export const connectedAppsLabels: ConnectedAppsLabels = {
  title: 'Connected apps',
  empty: 'No app uses your account yet.',
  platformNote: '{brand} apps are run by {brand} itself: they don’t ask for consent, and you leave them by signing out.',
  app: {},
};

export interface ConnectedAppsLogic {
  labels: () => ConnectedAppsLabels;
  apps: () => ConnectedApp[];
  brand: () => string;
  locale: () => string;
  scopeWords: () => Record<string, string>;
  describe: () => ((error: unknown) => string) | undefined;
  note: () => string;
}
