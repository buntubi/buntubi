/** One organization as a table row, with its suspension, changed through the injected `Admin` service. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/di';
import { Admin } from '@buntu/sdk/admin';
import { suspendSchema, type SuspendInput } from '@buntu/sdk/schemas/organizations';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import type { AdminOrganization } from '@buntu/sdk/types';
import { initials } from '../initials.js';
import { useView } from '../view.js';
import { organizationRowLabels, type OrganizationRowLabels, type OrganizationRowLogic, type SuspendForm } from './logic.js';
import { OrganizationRowView } from './view.js';

const props = {
  organization: prop.object<AdminOrganization | null>(null),
  /** Its apps: `{name}` is replaced. */
  appsHref: prop.string('/apps?q={name}'),
  labels: prop.object<Partial<OrganizationRowLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
  /** Checks the reason before suspending; messages are keys read through `messages`. */
  schema: prop.any<FormSchema<SuspendInput>>(suspendSchema),
  /** Text for validation keys; see messages.ts. */
  messages: prop.object<Messages>({}),
};

export class IdpOrganizationRow extends typedElement(props) {
  protected override render(): unknown {
    const admin = inject(Admin);
    const labels = () => ({ ...organizationRowLabels, ...this.labels });
    const suspending = signal(false);
    const text = messageReader(() => this.messages);
    const form: SuspendForm = createForm({
      reason: createField('', { validators: [fieldValidator<SuspendInput, 'reason'>(() => this.schema, 'reason', text)] }),
    });
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
        if (!open) form.get('reason').reset('');
      },
      form,
      suspend: (values) =>
        run(async () => {
          await admin.suspendOrganization({ id: id(), reason: values.reason.trim() });
          form.get('reason').reset('');
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
