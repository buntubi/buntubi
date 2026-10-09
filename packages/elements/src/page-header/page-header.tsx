/** A page's title, an optional line above it, and the line under it. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { PageAction, PageHeaderLogic } from './logic.js';
import { PageHeaderView } from './view.js';

const props = {
  eyebrow: prop.string(''),
  title: prop.string(''),
  intro: prop.string(''),
  actions: prop.object<PageAction[]>([]),
};

export class IdpPageHeader extends typedElement(props) {
  protected override render(): unknown {
    const logic: PageHeaderLogic = {
      eyebrow: () => this.eyebrow,
      title: () => this.title,
      intro: () => this.intro,
      actions: () => this.actions,
    };
    return useView(PageHeaderView)(logic);
  }
}

defineCustomElement('idp-page-header', IdpPageHeader);

declare global {
  interface HTMLElementTagNameMap {
    'idp-page-header': IdpPageHeader;
  }
  interface JSXCustomElements {
    'idp-page-header': ElementAttributes<typeof props>;
  }
}
