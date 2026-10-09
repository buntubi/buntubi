/** One API product: whether it is picked, what it is, its scopes, and whether it needs a review. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { Approval, ProductCardEvents, ProductCardLogic } from './logic.js';
import { ProductCardView } from './view.js';

const props = {
  name: prop.string(''),
  text: prop.string(''),
  scopes: prop.object<string[]>([]),
  /** A last line: how it signs in, how available it is. */
  meta: prop.string(''),
  approval: prop.string('none'),
  approvalLabel: prop.string(''),
  selected: prop.boolean(false),
};

export class IdpProductCard extends typedElement(props) {
  protected override render(): unknown {
    const logic: ProductCardLogic = {
      name: () => this.name,
      text: () => this.text,
      scopes: () => this.scopes,
      meta: () => this.meta,
      approval: () => this.approval as Approval,
      approvalLabel: () => this.approvalLabel,
      selected: () => this.selected,
      toggle: () => this.emit('toggle', {}),
    };
    return useView(ProductCardView)(logic);
  }
}

defineCustomElement('idp-product-card', IdpProductCard);

declare global {
  interface HTMLElementTagNameMap {
    'idp-product-card': IdpProductCard;
  }
  interface JSXCustomElements {
    'idp-product-card': ElementAttributes<typeof props, ProductCardEvents>;
  }
}
