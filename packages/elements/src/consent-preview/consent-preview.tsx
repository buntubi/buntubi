/** A small copy of the consent screen, updated as the app's name and icon change. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { ConsentPreviewLogic } from './logic.js';
import { ConsentPreviewView } from './view.js';

const props = {
  app: prop.string(''),
  platform: prop.string(''),
  logo: prop.string(''),
  title: prop.string('Consent preview'),
  /** `{app}` and `{platform}` are replaced. */
  text: prop.string('{app} wants to access your {platform} account'),
  links: prop.string('Privacy policy · Terms'),
  note: prop.string(''),
};

export class IdpConsentPreview extends typedElement(props) {
  protected override render(): unknown {
    const name = () => this.app.trim() || '…';
    const logic: ConsentPreviewLogic = {
      title: () => this.title,
      text: () => this.text.replace('{app}', name()).replace('{platform}', this.platform),
      links: () => this.links,
      note: () => this.note,
      mark: () => (this.app.trim()[0] ?? 'A').toUpperCase(),
      logo: () => (/^https:\/\//.test(this.logo) ? this.logo : ''),
    };
    return useView(ConsentPreviewView)(logic);
  }
}

defineCustomElement('idp-consent-preview', IdpConsentPreview);

declare global {
  interface HTMLElementTagNameMap {
    'idp-consent-preview': IdpConsentPreview;
  }
  interface JSXCustomElements {
    'idp-consent-preview': ElementAttributes<typeof props>;
  }
}
