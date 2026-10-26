/**
 * One provider's sign-in button. Its view is found for the provider first
 * (`idp-social-button:google`), then for every provider (`idp-social-button`), then the default:
 * a UI plugin replaces one provider's button, or all of them, through its `views`.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { Token } from '@fluixi/di';
import { useView, viewToken, type View } from '../view.js';
import { SOCIAL_ICONS } from './icons.js';
import type { SocialButtonLogic, SocialIcon } from './logic.js';
import { SocialButtonView } from './view.js';

const props = {
  provider: prop.string(''),
  label: prop.string(''),
  href: prop.string(''),
  /** In place of the provider's own mark; null for none. */
  icon: prop.any<SocialIcon | null | undefined>(undefined),
};

const perProvider = new Map<string, Token<View<SocialButtonLogic>>>();

export class IdpSocialButton extends typedElement(props) {
  protected override render(): unknown {
    const generic = useView(SocialButtonView);
    let token = perProvider.get(this.provider);
    if (!token) {
      token = viewToken<SocialButtonLogic>(`idp-social-button:${this.provider}`, (logic) => generic(logic));
      perProvider.set(this.provider, token);
    }
    const logic: SocialButtonLogic = {
      provider: () => this.provider,
      label: () => this.label,
      icon: () => (this.icon === undefined ? (SOCIAL_ICONS[this.provider] ?? null) : this.icon),
      href: () => this.href,
      go: () => window.location.assign(this.href),
    };
    return useView(token)(logic);
  }
}

defineCustomElement('idp-social-button', IdpSocialButton);

declare global {
  interface HTMLElementTagNameMap {
    'idp-social-button': IdpSocialButton;
  }
  interface JSXCustomElements {
    'idp-social-button': ElementAttributes<typeof props>;
  }
}
