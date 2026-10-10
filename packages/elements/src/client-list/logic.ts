/** Every app as a table, one row each; apart from the look. */
import type { AdminClient } from '@idp/sdk/types';
import type { ClientRowLabels } from '../client-row/logic.js';

export interface ClientListLabels {
  /** What the table is, for assistive technology. */
  title: string;
  app: string;
  organization: string;
  environment: string;
  firstParty: string;
  empty: string;
}

export const clientListLabels: ClientListLabels = {
  title: 'Applications',
  app: 'Application',
  organization: 'Organization',
  environment: 'Environment',
  firstParty: 'First-party',
  empty: 'No application.',
};

export interface ClientListLogic {
  labels: () => ClientListLabels;
  clients: () => AdminClient[];
  rowLabels: () => Partial<ClientRowLabels>;
  describe: () => ((error: unknown) => string) | undefined;
}
