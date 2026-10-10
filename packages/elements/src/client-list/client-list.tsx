/** Every app as a table, one `idp-client-row` each, in a card. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { AdminClient } from '@idp/sdk/types';
import '../client-row/client-row.js';
import type { ClientRowLabels } from '../client-row/logic.js';
import { useView } from '../view.js';
import { clientListLabels, type ClientListLabels, type ClientListLogic } from './logic.js';
import { ClientListView } from './view.js';

const props = {
  clients: prop.object<AdminClient[]>([]),
  labels: prop.object<Partial<ClientListLabels>>({}),
  /** Handed to every row. */
  rowLabels: prop.object<Partial<ClientRowLabels>>({}),
  /** Each app's page: `{client_id}` is replaced. */
  href: prop.string('/apps/{client_id}'),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpClientList extends typedElement(props) {
  protected override render(): unknown {
    const logic: ClientListLogic = {
      clients: () => this.clients,
      labels: () => ({ ...clientListLabels, ...this.labels }),
      rowLabels: () => this.rowLabels,
      describe: () => this.describe,
      href: () => this.href,
    };
    return useView(ClientListView)(logic);
  }
}

defineCustomElement('idp-client-list', IdpClientList);

declare global {
  interface HTMLElementTagNameMap {
    'idp-client-list': IdpClientList;
  }
  interface JSXCustomElements {
    'idp-client-list': ElementAttributes<typeof props>;
  }
}
