/**
 * The providers a sign-in page offers, one `idp-social-button` each, then a separator before the
 * email form. Nothing shows when none is offered. Its view can be replaced as a whole
 * (`idp-social-buttons`), each button on its own (see idp-social-button).
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import { socialButtonsLabels, type SocialButtonsLabels, type SocialButtonsLogic, type SocialProviderItem } from './logic.js';
import { SocialButtonsView } from './view.js';

const props = {
  providers: prop.any<SocialProviderItem[]>([]),
  labels: prop.object<Partial<SocialButtonsLabels>>({}),
  /** The address an app named, passed on to the provider. */
  loginHint: prop.string(''),
};

export class IdpSocialButtons extends typedElement(props) {
  protected override render(): unknown {
    const labels = () => ({ ...socialButtonsLabels, ...this.labels });
    const logic: SocialButtonsLogic = {
      labels,
      items: () =>
        (this.providers ?? []).map((item) => ({
          provider: item.id,
          label: labels().continueWith.replace('{provider}', item.label),
          href: `/signin/${encodeURIComponent(item.id)}${this.loginHint ? `?${new URLSearchParams({ login_hint: this.loginHint })}` : ''}`,
        })),
    };
    return useView(SocialButtonsView)(logic);
  }
}

defineCustomElement('idp-social-buttons', IdpSocialButtons);

declare global {
  interface HTMLElementTagNameMap {
    'idp-social-buttons': IdpSocialButtons;
  }
  interface JSXCustomElements {
    'idp-social-buttons': ElementAttributes<typeof props>;
  }
}
