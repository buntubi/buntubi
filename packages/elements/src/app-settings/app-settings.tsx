/** An app's basic information: its name, description, links and logo. Saved through `Developer`. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Developer } from '@idp/sdk/developer';
import type { App } from '@idp/sdk/types';
import { freshest } from '../fresh.js';
import { useView } from '../view.js';
import { appSettingsLabels, SETTINGS_FIELDS, type AppSettingsLabels, type AppSettingsLogic, type SettingsField } from './logic.js';
import { AppSettingsView } from './view.js';

const props = {
  app: prop.object<App | null>(null),
  canEdit: prop.boolean(false),
  labels: prop.object<Partial<AppSettingsLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

function storedValue(app: App | null, field: SettingsField): string {
  if (!app) return '';
  if (field === 'logo') return app.brand.logo ?? '';
  return app[field] ?? '';
}

export class DpAppSettings extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const labels = () => ({ ...appSettingsLabels, ...this.labels });
    const app = freshest(() => this.app);
    const edits = signal<Partial<Record<SettingsField, string>>>({});
    const busy = signal(false);
    const saved = signal(false);
    const error = signal<string | null>(null);
    const value = (field: SettingsField) => edits()[field] ?? storedValue(app.current(), field);
    const link = (field: SettingsField) => value(field).trim() || null;

    const logic: AppSettingsLogic = {
      labels,
      fields: () => SETTINGS_FIELDS,
      value,
      edit: (field, next) => {
        edits.set({ ...edits(), [field]: next });
        saved.set(false);
      },
      changed: () => SETTINGS_FIELDS.some((field) => value(field) !== storedValue(app.current(), field)),
      canEdit: () => this.canEdit,
      save: async () => {
        if (!value('name').trim()) {
          error.set(labels().nameRequired);
          return;
        }
        busy.set(true);
        error.set(null);
        try {
          const answer = await developer.updateApp({
            client_id: app.current()?.client_id ?? '',
            patch: {
              name: value('name').trim(),
              description: value('description').trim(),
              homepage_url: link('homepage_url'),
              privacy_url: link('privacy_url'),
              terms_url: link('terms_url'),
              brand: { ...app.current()?.brand, logo: link('logo') },
            },
          });
          app.adopt(answer);
          edits.set({});
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

defineCustomElement('dp-app-settings', DpAppSettings);

declare global {
  interface HTMLElementTagNameMap {
    'dp-app-settings': DpAppSettings;
  }
  interface JSXCustomElements {
    'dp-app-settings': ElementAttributes<typeof props>;
  }
}
