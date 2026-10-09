/** Which API products the app uses: a heading, a line, and one `idp-product-card` each. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import '../product-card/product-card.js';
import { useView } from '../view.js';
import type { ProductEntry, ProductPickerEvents, ProductPickerLogic } from './logic.js';
import { ProductPickerView } from './view.js';

const props = {
  products: prop.object<ProductEntry[]>([]),
  title: prop.string('Select API products'),
  intro: prop.string(''),
  empty: prop.string('No API product is available yet.'),
};

export class IdpProductPicker extends typedElement(props) {
  protected override render(): unknown {
    const logic: ProductPickerLogic = {
      title: () => this.title,
      intro: () => this.intro,
      empty: () => this.empty,
      products: () => this.products,
      toggle: (slug) => this.emit('toggle', { slug }),
    };
    return useView(ProductPickerView)(logic);
  }
}

defineCustomElement('idp-product-picker', IdpProductPicker);

declare global {
  interface HTMLElementTagNameMap {
    'idp-product-picker': IdpProductPicker;
  }
  interface JSXCustomElements {
    'idp-product-picker': ElementAttributes<typeof props, ProductPickerEvents>;
  }
}
