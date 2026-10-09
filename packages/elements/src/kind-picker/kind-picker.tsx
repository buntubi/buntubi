/** What is being built: a heading, a line, and one `idp-kind-card` per kind. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import '../kind-card/kind-card.js';
import { useView } from '../view.js';
import type { KindEntry, KindPickerEvents, KindPickerLogic } from './logic.js';
import { KindPickerView } from './view.js';

const props = {
  kinds: prop.object<KindEntry[]>([]),
  selected: prop.string(''),
  title: prop.string('What are you building?'),
  intro: prop.string(''),
};

export class IdpKindPicker extends typedElement(props) {
  protected override render(): unknown {
    const logic: KindPickerLogic = {
      title: () => this.title,
      intro: () => this.intro,
      kinds: () => this.kinds,
      selected: () => this.selected,
      choose: (kind) => this.emit('choose', { kind }),
    };
    return useView(KindPickerView)(logic);
  }
}

defineCustomElement('idp-kind-picker', IdpKindPicker);

declare global {
  interface HTMLElementTagNameMap {
    'idp-kind-picker': IdpKindPicker;
  }
  interface JSXCustomElements {
    'idp-kind-picker': ElementAttributes<typeof props, KindPickerEvents>;
  }
}
