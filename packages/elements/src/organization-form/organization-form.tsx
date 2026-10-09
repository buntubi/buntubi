/** The form for a new organization, sent through the injected `Developer` service. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Developer } from '@idp/sdk/developer';
import { useView } from '../view.js';
import {
  organizationFormLabels,
  type OrganizationFormEvents,
  type OrganizationFormLabels,
  type OrganizationFormLogic,
} from './logic.js';
import { OrganizationFormView } from './view.js';

const props = {
  labels: prop.object<Partial<OrganizationFormLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpOrganizationForm extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const labels = () => ({ ...organizationFormLabels, ...this.labels });
    const name = signal('');
    const supportEmail = signal('');
    const busy = signal(false);
    const error = signal<string | null>(null);
    const logic: OrganizationFormLogic = {
      labels,
      name,
      supportEmail,
      editName: (value) => name.set(value),
      editSupportEmail: (value) => supportEmail.set(value),
      canCreate: () => !busy() && !!name().trim(),
      create: async () => {
        busy.set(true);
        error.set(null);
        try {
          const organization = await developer.createOrganization({
            name: name().trim(),
            support_email: supportEmail().trim() || undefined,
          });
          name.set('');
          supportEmail.set('');
          this.emit('created', { id: organization.id });
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(false);
        }
      },
      error,
    };
    return useView(OrganizationFormView)(logic);
  }
}

defineCustomElement('idp-organization-form', IdpOrganizationForm);

declare global {
  interface HTMLElementTagNameMap {
    'idp-organization-form': IdpOrganizationForm;
  }
  interface JSXCustomElements {
    'idp-organization-form': ElementAttributes<typeof props, OrganizationFormEvents>;
  }
}
