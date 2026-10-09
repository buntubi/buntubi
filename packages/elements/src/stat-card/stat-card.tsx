/** One count as a card that opens the page behind it. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { StatCardLogic, StatTone } from './logic.js';
import { StatCardView } from './view.js';

const props = {
  label: prop.string(''),
  value: prop.number(0),
  /** Where the card leads; none makes it a plain card. */
  href: prop.string(''),
  attention: prop.boolean(false),
  note: prop.string(''),
  /** The note's colour. */
  tone: prop.string('muted'),
};

export class IdpStatCard extends typedElement(props) {
  protected override render(): unknown {
    const logic: StatCardLogic = {
      label: () => this.label,
      value: () => String(this.value),
      href: () => this.href,
      attention: () => this.attention,
      note: () => this.note,
      tone: () => this.tone as StatTone,
    };
    return useView(StatCardView)(logic);
  }
}

defineCustomElement('idp-stat-card', IdpStatCard);

declare global {
  interface HTMLElementTagNameMap {
    'idp-stat-card': IdpStatCard;
  }
  interface JSXCustomElements {
    'idp-stat-card': ElementAttributes<typeof props>;
  }
}
