/**
 * Says why a sign-in did not go through, from the `auth_error` an app came back with, and
 * offers another attempt. Renders nothing without an error.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import { authNoticeLabels, type AuthNoticeEvents, type AuthNoticeLabels, type AuthNoticeLogic } from './logic.js';
import { AuthNoticeView } from './view.js';

const props = {
  error: prop.string(''),
  labels: prop.object<Partial<AuthNoticeLabels>>({}),
};

export class IdpAuthNotice extends typedElement(props) {
  protected override render(): unknown {
    const labels = () => ({ ...authNoticeLabels, ...this.labels });
    const logic: AuthNoticeLogic = {
      error: () => this.error,
      message: () => labels().reasons[this.error] ?? labels().generic,
      labels,
      retry: () => this.emit('retry', { error: this.error }),
      dismiss: () => this.emit('dismiss', { error: this.error }),
    };
    return useView(AuthNoticeView)(logic);
  }
}

defineCustomElement('idp-auth-notice', IdpAuthNotice);

declare global {
  interface HTMLElementTagNameMap {
    'idp-auth-notice': IdpAuthNotice;
  }
  interface JSXCustomElements {
    'idp-auth-notice': ElementAttributes<typeof props, AuthNoticeEvents>;
  }
}
