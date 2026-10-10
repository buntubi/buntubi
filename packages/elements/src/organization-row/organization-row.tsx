/** One organization as a table row, with its suspension, changed through the injected `Admin` service. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Admin } from '@idp/sdk/admin';
import type { AdminOrganization } from '@idp/sdk/types';
import { initials } from '../initials.js';
import { useView } from '../view.js';
import { organizationRowLabels, type OrganizationRowLabels, type OrganizationRowLogic } from './logic.js';
import { OrganizationRowView } from './view.js';

const props = {
  organization: prop.object<AdminOrganization | null>(null),
  /** Its apps: `{name}` is replaced. */
  appsHref: prop.string('/apps?q={name}'),
  labels: prop.object<Partial<OrganizationRowLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpOrganizationRow extends typedElement(props) {
  protected override render(): unknown {
    const admin = inject(Admin);
    const labels = () => ({ ...organizationRowLabels, ...this.labels });
    const suspending = signal(false);
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
    const logic: OrganizationRowLogic = {
      labels,
      organization: () => this.organization,
      appsHref: () => this.appsHref.replace('{name}', encodeURIComponent(this.organization?.name ?? '')),
      initials: () => initials(this.organization?.name),
      suspending,
      openSuspend: (open) => {
        suspending.set(open);
        if (!open) reason.set('');
      },
      reason,
      editReason: (value) => reason.set(value),
      canSuspend: () => !busy() && !!reason().trim(),
      suspend: () =>
        run(async () => {
          await admin.suspendOrganization({ id: id(), reason: reason().trim() });
          reason.set('');
          suspending.set(false);
        }),
      restore: () => run(() => admin.restoreOrganization(id())),
      busy,
      error,
    };
    return useView(OrganizationRowView)(logic);
  }
}

defineCustomElement('idp-organization-row', IdpOrganizationRow);

declare global {
  interface HTMLElementTagNameMap {
    'idp-organization-row': IdpOrganizationRow;
  }
  interface JSXCustomElements {
    'idp-organization-row': ElementAttributes<typeof props>;
  }
}
