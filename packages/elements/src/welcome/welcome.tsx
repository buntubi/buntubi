/** The way in for a signed-out visitor: what the portal is for, and signing in. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import { welcomeLabels, type WelcomeEvents, type WelcomeLabels, type WelcomeLogic } from './logic.js';
import { WelcomeView } from './view.js';

const props = {
  labels: prop.object<Partial<WelcomeLabels>>({}),
};

export class IdpWelcome extends typedElement(props) {
  protected override render(): unknown {
    const logic: WelcomeLogic = {
      labels: () => ({ ...welcomeLabels, ...this.labels }),
      signIn: () => this.emit('signin', {}),
    };
    return useView(WelcomeView)(logic);
  }
}

defineCustomElement('idp-welcome', IdpWelcome);

declare global {
  interface HTMLElementTagNameMap {
    'idp-welcome': IdpWelcome;
  }
  interface JSXCustomElements {
    'idp-welcome': ElementAttributes<typeof props, WelcomeEvents>;
  }
}
