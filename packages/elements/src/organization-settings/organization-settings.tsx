/**
 * An organization's name, description and support email, and its deletion. Through the
 * injected `Developer` service; `deleted` tells the host the organization is gone.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Developer } from '@idp/sdk/developer';
import type { Organization } from '@idp/sdk/types';
import { freshest } from '../fresh.js';
import { useView } from '../view.js';
import {
  ORGANIZATION_FIELDS,
  organizationSettingsLabels,
  type OrganizationField,
  type OrganizationSettingsLabels,
  type OrganizationSettingsLogic,
} from './logic.js';
import { OrganizationSettingsView } from './view.js';

const props = {
  organization: prop.object<Organization | null>(null),
  canEdit: prop.boolean(false),
  canDelete: prop.boolean(false),
  labels: prop.object<Partial<OrganizationSettingsLabels>>({}),
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
    const edits = signal<Partial<Record<OrganizationField, string>>>({});
    const confirmation = signal('');
    const busy = signal<string | null>(null);
    const saved = signal(false);
    const error = signal<string | null>(null);
    const value = (field: OrganizationField) => edits()[field] ?? stored(organization.current(), field);
    const id = () => organization.current()?.id ?? '';

    const logic: OrganizationSettingsLogic = {
      labels,
      fields: () => ORGANIZATION_FIELDS,
      value,
      edit: (field, next) => {
        edits.set({ ...edits(), [field]: next });
        saved.set(false);
      },
      changed: () => ORGANIZATION_FIELDS.some((field) => value(field) !== stored(organization.current(), field)),
      canEdit: () => this.canEdit,
      save: async () => {
        if (!value('name').trim()) {
          error.set(labels().nameRequired);
          return;
        }
        busy.set('save');
        error.set(null);
        try {
          organization.adopt(
            await developer.updateOrganization({
              organization: id(),
              patch: {
                name: value('name').trim(),
                description: value('description').trim(),
                support_email: value('support_email').trim() || null,
              },
            }),
          );
          edits.set({});
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
