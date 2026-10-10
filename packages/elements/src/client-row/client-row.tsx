/** One app; first-party set through the injected `Admin` service. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Admin } from '@idp/sdk/admin';
import type { AdminClient } from '@idp/sdk/types';
import { useView } from '../view.js';
import { clientRowLabels, type ClientRowLabels, type ClientRowLogic } from './logic.js';
import { ClientRowView } from './view.js';

const props = {
  client: prop.object<AdminClient | null>(null),
  labels: prop.object<Partial<ClientRowLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpClientRow extends typedElement(props) {
  protected override render(): unknown {
    const admin = inject(Admin);
    const labels = () => ({ ...clientRowLabels, ...this.labels });
    const busy = signal(false);
    const error = signal<string | null>(null);
    const logic: ClientRowLogic = {
      labels,
      client: () => this.client,
      setFirstParty: async (on) => {
        const c = this.client;
        if (!c) return;
        busy.set(true);
        error.set(null);
        try {
          await admin.setFirstParty({ client_id: c.client_id, first_party: on });
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(false);
        }
      },
      busy,
      error,
    };
    return useView(ClientRowView)(logic);
  }
}

defineCustomElement('idp-client-row', IdpClientRow);

declare global {
  interface HTMLElementTagNameMap {
    'idp-client-row': IdpClientRow;
  }
  interface JSXCustomElements {
    'idp-client-row': ElementAttributes<typeof props>;
  }
}
