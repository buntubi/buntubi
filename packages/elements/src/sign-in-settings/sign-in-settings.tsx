/** The deployment's sign-in settings for the console, read only. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { PROFILE_FIELDS } from '@buntubi/sdk/account';
import type { SignInSettings } from '@buntubi/sdk/types';
import { useView } from '../view.js';
import { labelIn } from '../about-section/platform-field-input.js';
import { signInSettingsLabels, type SignInSettingsLabels, type SignInSettingsLogic } from './logic.js';
import { SignInSettingsView } from './view.js';

const props = {
  settings: prop.object<SignInSettings | null>(null),
  locale: prop.string('en'),
  labels: prop.object<Partial<SignInSettingsLabels>>({}),
};

export class IdpSignInSettings extends typedElement(props) {
  protected override render(): unknown {
    const labels = () => ({ ...signInSettingsLabels, ...this.labels });
    const logic: SignInSettingsLogic = {
      labels,
      settings: () => this.settings,
      state: (provider) => {
        const l = labels();
        if (provider.listed && provider.configured) return { text: l.offered, on: true };
        if (provider.listed) return { text: l.noClient, on: false };
        if (provider.configured) return { text: l.notListed, on: false };
        return { text: l.off, on: false };
      },
      fields: () => {
        const shown = this.settings?.profile_fields ?? {};
        const standard = PROFILE_FIELDS.flatMap((field) => {
          const mode = shown[field];
          return mode ? [`${labels().fields[field]} (${labels().modes[mode]})`] : [];
        });
        const own = (this.settings?.platform_fields ?? []).map(
          (field) => `${labelIn(field.label, this.locale)} (${labels().modes[field.mode]})`,
        );
        return [...standard, ...own];
      },
    };
    return useView(SignInSettingsView)(logic);
  }
}

defineCustomElement('idp-sign-in-settings', IdpSignInSettings);

declare global {
  interface HTMLElementTagNameMap {
    'idp-sign-in-settings': IdpSignInSettings;
  }
  interface JSXCustomElements {
    'idp-sign-in-settings': ElementAttributes<typeof props>;
  }
}
