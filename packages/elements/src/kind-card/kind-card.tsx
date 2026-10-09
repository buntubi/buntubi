/** One kind of app: its icon, its name, what it is for. Pressing it chooses it. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { KindCardEvents, KindCardLogic } from './logic.js';
import { KindCardView } from './view.js';

const props = {
  title: prop.string(''),
  text: prop.string(''),
  icon: prop.string(''),
  selected: prop.boolean(false),
};

export class IdpKindCard extends typedElement(props) {
  protected override render(): unknown {
    const logic: KindCardLogic = {
      title: () => this.title,
      text: () => this.text,
      icon: () => this.icon,
      selected: () => this.selected,
      choose: () => this.emit('choose', {}),
    };
    return useView(KindCardView)(logic);
  }
}

defineCustomElement('idp-kind-card', IdpKindCard);

declare global {
  interface HTMLElementTagNameMap {
    'idp-kind-card': IdpKindCard;
  }
  interface JSXCustomElements {
    'idp-kind-card': ElementAttributes<typeof props, KindCardEvents>;
  }
}
