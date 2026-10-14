/** One app; first-party and access changed through the injected `Admin` service. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/di';
import { Admin } from '@buntu/sdk/admin';
import type { AdminClient } from '@buntu/sdk/types';
import { useView } from '../view.js';
import { clientDetailLabels, type ClientDetailLabels, type ClientDetailLogic } from './logic.js';
import { ClientDetailView } from './view.js';

const props = {
  client: prop.object<AdminClient | null>(null),
  /** The portal's page for an app: `{organization_id}` and `{client_id}` are replaced. Empty: no link. */
  portalHref: prop.string(''),
  locale: prop.string('en'),
  labels: prop.object<Partial<ClientDetailLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpClientDetail extends typedElement(props) {
  protected override render(): unknown {
    const admin = inject(Admin);
    const labels = () => ({ ...clientDetailLabels, ...this.labels });
    const busy = signal(false);
    const error = signal<string | null>(null);
    const run = async (change: (client: AdminClient) => Promise<void>) => {
      const c = this.client;
      if (!c) return;
      busy.set(true);
      error.set(null);
      try {
        await change(c);
      } catch (failure) {
        error.set(this.describe?.(failure) ?? labels().error);
      } finally {
        busy.set(false);
      }
    };
    const logic: ClientDetailLogic = {
      labels,
      client: () => this.client,
      scopes: () => (this.client?.scope ?? '').split(' ').filter(Boolean),
      created: () => {
        const at = this.client?.created_at;
        return at ? new Intl.DateTimeFormat(this.locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(at)) : '';
      },
      portalHref: () => {
        const c = this.client;
        if (!c || !this.portalHref || !c.organization_id) return '';
        return this.portalHref
          .replace('{organization_id}', encodeURIComponent(c.organization_id))
          .replace('{client_id}', encodeURIComponent(c.client_id));
      },
      setFirstParty: (on) => run((c) => admin.setFirstParty({ client_id: c.client_id, first_party: on })),
      toggleDisabled: () => run((c) => admin.setClientDisabled({ client_id: c.client_id, disabled: !c.disabled })),
      busy,
      error,
    };
    return useView(ClientDetailView)(logic);
  }
}

defineCustomElement('idp-client-detail', IdpClientDetail);

declare global {
  interface HTMLElementTagNameMap {
    'idp-client-detail': IdpClientDetail;
  }
  interface JSXCustomElements {
    'idp-client-detail': ElementAttributes<typeof props>;
  }
}
