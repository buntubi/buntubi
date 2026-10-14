/**
 * An organization's name, description and support email, and its deletion. Through the
 * injected `Developer` service; `deleted` tells the host the organization is gone.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/di';
import { Developer } from '@buntubi/sdk/developer';
import { organizationSchema, type OrganizationInput } from '@buntubi/sdk/schemas/organizations';
import type { Organization } from '@buntubi/sdk/types';
import { freshest } from '../fresh.js';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import { useView } from '../view.js';
import {
  ORGANIZATION_FIELDS,
  organizationSettingsLabels,
  type OrganizationField,
  type OrganizationSettingsForm,
  type OrganizationSettingsLabels,
  type OrganizationSettingsLogic,
} from './logic.js';
import { OrganizationSettingsView } from './view.js';

const props = {
  organization: prop.object<Organization | null>(null),
  canEdit: prop.boolean(false),
  canDelete: prop.boolean(false),
  labels: prop.object<Partial<OrganizationSettingsLabels>>({}),
  /** Checks each field before it is saved; messages are keys read through `messages`. */
  schema: prop.any<FormSchema<OrganizationInput>>(organizationSchema),
  /** Text for validation keys; see messages.ts. */
  messages: prop.object<Messages>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

function stored(organization: Organization | null, field: OrganizationField): string {
  return (organization?.[field] as string | null | undefined) ?? '';
}

export class IdpOrganizationSettings extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const labels = () => ({ ...organizationSettingsLabels, ...this.labels });
    const organization = freshest(() => this.organization);
    const text = messageReader(() => this.messages);
    const check = <K extends keyof OrganizationInput & string>(field: K) =>
      fieldValidator<OrganizationInput, K>(() => this.schema, field, text);
    const start = organization.current();
    const form: OrganizationSettingsForm = createForm({
      name: createField(stored(start, 'name'), { validators: [check('name')] }),
      description: createField(stored(start, 'description'), { validators: [check('description')] }),
      support_email: createField(stored(start, 'support_email'), { validators: [check('support_email')] }),
    });
    const confirmation = signal('');
    const busy = signal<string | null>(null);
    const saved = signal(false);
    const error = signal<string | null>(null);
    const id = () => organization.current()?.id ?? '';

    const logic: OrganizationSettingsLogic = {
      labels,
      fields: () => ORGANIZATION_FIELDS,
      form,
      changed: () => ORGANIZATION_FIELDS.some((field) => form.get(field).value() !== stored(organization.current(), field)),
      canEdit: () => this.canEdit,
      save: async (values) => {
        busy.set('save');
        error.set(null);
        saved.set(false);
        try {
          organization.adopt(
            await developer.updateOrganization({
              organization: id(),
              patch: {
                name: values.name.trim(),
                description: values.description.trim(),
                support_email: values.support_email.trim() || null,
              },
            }),
          );
          saved.set(true);
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(null);
        }
      },
      saved,
      canDelete: () => this.canDelete,
      name: () => organization.current()?.name ?? '',
      confirmation,
      confirm: (next) => confirmation.set(next),
      confirmed: () => !!organization.current() && confirmation().trim() === organization.current()?.name,
      remove: async () => {
        if (confirmation().trim() !== organization.current()?.name) return;
        busy.set('delete');
        error.set(null);
        try {
          const gone = id();
          await developer.deleteOrganization(gone);
          this.emit('deleted', { id: gone });
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(null);
        }
      },
      busy,
      error,
    };
    return useView(OrganizationSettingsView)(logic);
  }
}

defineCustomElement('idp-organization-settings', IdpOrganizationSettings);

declare global {
  interface HTMLElementTagNameMap {
    'idp-organization-settings': IdpOrganizationSettings;
  }
  interface JSXCustomElements {
    'idp-organization-settings': ElementAttributes<typeof props>;
  }
}
