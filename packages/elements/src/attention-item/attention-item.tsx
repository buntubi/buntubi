/** One thing that needs the reader: a coloured dot, what it is, a line about it, where to act. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { AttentionItemLogic, AttentionTone } from './logic.js';
import { AttentionItemView } from './view.js';

const props = {
  title: prop.string(''),
  text: prop.string(''),
  href: prop.string(''),
  tone: prop.string('warn'),
};

export class IdpAttentionItem extends typedElement(props) {
  protected override render(): unknown {
    const logic: AttentionItemLogic = {
      title: () => this.title,
      text: () => this.text,
      href: () => this.href,
      tone: () => this.tone as AttentionTone,
    };
    return useView(AttentionItemView)(logic);
  }
}

defineCustomElement('idp-attention-item', IdpAttentionItem);

declare global {
  interface HTMLElementTagNameMap {
    'idp-attention-item': IdpAttentionItem;
  }
  interface JSXCustomElements {
    'idp-attention-item': ElementAttributes<typeof props>;
  }
}
