/**
 * The form for a new organization, checked with `schema` and sent through the injected
 * `Developer` service.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/di';
import { Developer } from '@buntubi/sdk/developer';
import { organizationSchema, type OrganizationInput } from '@buntubi/sdk/schemas/organizations';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import { useView } from '../view.js';
import {
  organizationFormLabels,
  type OrganizationForm,
  type OrganizationFormEvents,
  type OrganizationFormLabels,
  type OrganizationFormLogic,
  type OrganizationFormValues,
} from './logic.js';
import { OrganizationFormView } from './view.js';

const props = {
  /** Checks each field before it is sent; messages are keys read through `messages`. */
  schema: prop.any<FormSchema<OrganizationInput>>(organizationSchema),
  labels: prop.object<Partial<OrganizationFormLabels>>({}),
  /** Text for validation keys; see messages.ts. */
  messages: prop.object<Messages>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpOrganizationForm extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const labels = () => ({ ...organizationFormLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const check = <K extends keyof OrganizationInput & string>(field: K) =>
      fieldValidator<OrganizationInput, K>(() => this.schema, field, text);
    const form: OrganizationForm = createForm({
      name: createField('', { validators: [check('name')] }),
      support_email: createField('', { validators: [check('support_email')] }),
    });
    const busy = signal(false);
    const error = signal<string | null>(null);
    const logic: OrganizationFormLogic = {
      labels,
      form,
      create: async (values: OrganizationFormValues) => {
        busy.set(true);
        error.set(null);
        try {
          const organization = await developer.createOrganization({
            name: values.name.trim(),
            support_email: values.support_email.trim() || undefined,
          });
          form.get('name').reset('');
          form.get('support_email').reset('');
          this.emit('created', { id: organization.id });
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(false);
        }
      },
      busy,
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
