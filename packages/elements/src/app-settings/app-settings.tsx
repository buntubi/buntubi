/** An app's basic information: its name, description, links and logo. Saved through `Developer`. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { createField, createForm } from '@fluixi/forms';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/di';
import { Developer } from '@buntu/sdk/developer';
import type { App } from '@buntu/sdk/types';
import { appSettingsSchema, type AppSettingsInput } from '@buntu/sdk/schemas/apps';
import { freshest } from '../fresh.js';
import { messageReader, type Messages } from '../messages.js';
import { fieldValidator, type FormSchema } from '../validators.js';
import { useView } from '../view.js';
import { appSettingsLabels, SETTINGS_FIELDS, type AppSettingsForm, type AppSettingsLabels, type AppSettingsLogic, type SettingsField } from './logic.js';
import { AppSettingsView } from './view.js';

const props = {
  app: prop.object<App | null>(null),
  canEdit: prop.boolean(false),
  labels: prop.object<Partial<AppSettingsLabels>>({}),
  /** Checks each field before it is saved; messages are keys read through `messages`. */
  schema: prop.any<FormSchema<AppSettingsInput>>(appSettingsSchema),
  /** Text for validation keys; see messages.ts. */
  messages: prop.object<Messages>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

function storedValue(app: App | null, field: SettingsField): string {
  if (!app) return '';
  if (field === 'logo') return app.brand.logo ?? '';
  return app[field] ?? '';
}

export class IdpAppSettings extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const labels = () => ({ ...appSettingsLabels, ...this.labels });
    const app = freshest(() => this.app);
    const text = messageReader(() => this.messages);
    const check = <K extends keyof AppSettingsInput & string>(field: K) =>
      fieldValidator<AppSettingsInput, K>(() => this.schema, field, text);
    const start = app.current();
    const form: AppSettingsForm = createForm({
      name: createField(storedValue(start, 'name'), { validators: [check('name')] }),
      description: createField(storedValue(start, 'description'), { validators: [check('description')] }),
      homepage_url: createField(storedValue(start, 'homepage_url'), { validators: [check('homepage_url')] }),
      privacy_url: createField(storedValue(start, 'privacy_url'), { validators: [check('privacy_url')] }),
      terms_url: createField(storedValue(start, 'terms_url'), { validators: [check('terms_url')] }),
      logo: createField(storedValue(start, 'logo'), { validators: [check('logo')] }),
    });
    const busy = signal(false);
    const saved = signal(false);
    const error = signal<string | null>(null);
    const link = (value: string) => value.trim() || null;

    const logic: AppSettingsLogic = {
      labels,
      fields: () => SETTINGS_FIELDS,
      form,
      changed: () => SETTINGS_FIELDS.some((field) => form.get(field).value() !== storedValue(app.current(), field)),
      canEdit: () => this.canEdit,
      save: async (values) => {
        busy.set(true);
        error.set(null);
        saved.set(false);
        try {
          const answer = await developer.updateApp({
            client_id: app.current()?.client_id ?? '',
            patch: {
              name: values.name.trim(),
              description: values.description.trim(),
              homepage_url: link(values.homepage_url),
              privacy_url: link(values.privacy_url),
              terms_url: link(values.terms_url),
              brand: { ...app.current()?.brand, logo: link(values.logo) },
            },
          });
          app.adopt(answer);
          saved.set(true);
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(false);
        }
      },
      busy,
      saved,
      error,
    };
    return useView(AppSettingsView)(logic);
  }
}

defineCustomElement('idp-app-settings', IdpAppSettings);

declare global {
  interface HTMLElementTagNameMap {
    'idp-app-settings': IdpAppSettings;
  }
  interface JSXCustomElements {
    'idp-app-settings': ElementAttributes<typeof props>;
  }
}
