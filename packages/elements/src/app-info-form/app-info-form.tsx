/** The app's name, description, links, category and platforms. Reports each edit; keeps nothing. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import { appInfoFormLabels, type AppInfoFormEvents, type AppInfoFormLabels, type AppInfoFormLogic, type InfoField, type PlatformEntry } from './logic.js';
import { AppInfoFormView } from './view.js';

const props = {
  values: prop.object<Partial<Record<InfoField, string>>>({}),
  platforms: prop.object<PlatformEntry[]>([]),
  labels: prop.object<Partial<AppInfoFormLabels>>({}),
};

export class IdpAppInfoForm extends typedElement(props) {
  protected override render(): unknown {
    const logic: AppInfoFormLogic = {
      labels: () => ({ ...appInfoFormLabels, ...this.labels }),
      value: (field) => this.values[field] ?? '',
      edit: (field, value) => this.emit('edit', { field, value }),
      platforms: () => this.platforms,
      toggle: (platform) => this.emit('platform', { platform }),
    };
    return useView(AppInfoFormView)(logic);
  }
}

defineCustomElement('idp-app-info-form', IdpAppInfoForm);

declare global {
  interface HTMLElementTagNameMap {
    'idp-app-info-form': IdpAppInfoForm;
  }
  interface JSXCustomElements {
    'idp-app-info-form': ElementAttributes<typeof props, AppInfoFormEvents>;
  }
}
