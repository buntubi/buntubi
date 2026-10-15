/**
 * The organizations an app that requires one may act in. Choosing one emits `select` after the
 * host's `action` resolves.
 */
import { useView } from '@buntubi/sdk/view';
import { OrganizationSelectView } from './view.js';
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import type { ElementAction } from '../shared/element-action.js';

export interface OrganizationItem {
  id: string;
  name: string;
  /** The person's role there: owner, admin, billing, member or guest. */
  role: string;
}

export interface OrganizationSelectLabels {
  /** The subtitle with an app: {app} is its name. */
  continueTo: string;
  /** The note under the list with an app. */
  sees: string;
  roles: Record<string, string>;
}

export const organizationSelectLabels: OrganizationSelectLabels = {
  continueTo: 'to continue to {app}',
  sees: '{app} works in the organization you choose, and only there.',
  roles: { owner: 'Owner', admin: 'Admin', billing: 'Billing', member: 'Member', guest: 'Guest' },
};

export interface OrganizationSelectEvents {
  select: { id: string; result: unknown };
}

const props = {
  organizations: prop.object<OrganizationItem[]>([]),
  action: prop.any<ElementAction<{ id: string }> | undefined>(undefined),
  labels: prop.object<Partial<OrganizationSelectLabels>>({}),
};

export class IdpOrganizationSelect extends typedElement(props) {
  /** What the view draws from; a deployment can give its own view (UI plugin `views`). */
  logic() {
    const label = () => ({ ...organizationSelectLabels, ...this.labels });
    const busy = signal<string | null>(null);

    const choose = async (id: string) => {
      busy.set(id);
      try {
        const result = await this.action?.({ id });
        this.emit('select', { id, result });
      } catch {
        // The host reports its own failure; the list stays as it was.
      } finally {
        busy.set(null);
      }
    };

    return { busy, choose, label, organizations: () => this.organizations };
  }

  protected override render(): unknown {
    return useView(OrganizationSelectView)(this.logic());
  }
}

export type OrganizationSelectLogic = ReturnType<IdpOrganizationSelect['logic']>;

defineCustomElement('idp-organization-select', IdpOrganizationSelect);

declare global {
  interface HTMLElementTagNameMap {
    'idp-organization-select': IdpOrganizationSelect;
  }
  interface JSXCustomElements {
    'idp-organization-select': ElementAttributes<typeof props, OrganizationSelectEvents>;
  }
}
