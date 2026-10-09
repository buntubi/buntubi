/** One organization, with its suspension, changed through the injected `Admin` service. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Admin } from '@idp/sdk/admin';
import type { AdminOrganization } from '@idp/sdk/types';
import { useView } from '../view.js';
import { organizationCardLabels, type OrganizationCardLabels, type OrganizationCardLogic } from './logic.js';
import { OrganizationCardView } from './view.js';

const props = {
  organization: prop.object<AdminOrganization | null>(null),
  labels: prop.object<Partial<OrganizationCardLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpOrganizationCard extends typedElement(props) {
  protected override render(): unknown {
    const admin = inject(Admin);
    const labels = () => ({ ...organizationCardLabels, ...this.labels });
    const reason = signal('');
    const busy = signal(false);
    const error = signal<string | null>(null);
    const run = async (work: () => Promise<void>) => {
      busy.set(true);
      error.set(null);
      try {
        await work();
      } catch (failure) {
        error.set(this.describe?.(failure) ?? labels().error);
      } finally {
        busy.set(false);
      }
    };
    const id = () => this.organization?.id ?? '';
    const logic: OrganizationCardLogic = {
      labels,
      organization: () => this.organization,
      summary: () => {
        const o = this.organization;
        const l = labels();
        return o ? `${l.owner} ${o.owner?.email ?? ''} · ${o.members} ${l.members} · ${o.apps} ${l.apps}` : '';
      },
      reason,
      editReason: (value) => reason.set(value),
      canSuspend: () => !busy() && !!reason().trim(),
      suspend: () =>
        run(async () => {
          await admin.suspendOrganization({ id: id(), reason: reason().trim() });
          reason.set('');
        }),
      restore: () => run(() => admin.restoreOrganization(id())),
      busy,
      error,
    };
    return useView(OrganizationCardView)(logic);
  }
}

defineCustomElement('idp-organization-card', IdpOrganizationCard);

declare global {
  interface HTMLElementTagNameMap {
    'idp-organization-card': IdpOrganizationCard;
  }
  interface JSXCustomElements {
    'idp-organization-card': ElementAttributes<typeof props>;
  }
}
