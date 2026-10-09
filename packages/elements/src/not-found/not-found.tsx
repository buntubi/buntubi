/** Shown where a page would be when what the address names is not there. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import { notFoundLabels, type NotFoundLabels, type NotFoundLogic } from './logic.js';
import { NotFoundView } from './view.js';

const props = {
  /** Where the way back leads. */
  href: prop.string('/'),
  labels: prop.object<Partial<NotFoundLabels>>({}),
};

export class IdpNotFound extends typedElement(props) {
  protected override render(): unknown {
    const logic: NotFoundLogic = {
      labels: () => ({ ...notFoundLabels, ...this.labels }),
      href: () => this.href,
    };
    return useView(NotFoundView)(logic);
  }
}

defineCustomElement('idp-not-found', IdpNotFound);

declare global {
  interface HTMLElementTagNameMap {
    'idp-not-found': IdpNotFound;
  }
  interface JSXCustomElements {
    'idp-not-found': ElementAttributes<typeof props>;
  }
}
