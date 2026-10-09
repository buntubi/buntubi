/** Counts laid out together, one `idp-stat-card` each. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import '../stat-card/stat-card.js';
import { useView } from '../view.js';
import type { Stat, StatGroupLogic } from './logic.js';
import { StatGroupView } from './view.js';

const props = {
  stats: prop.object<Stat[]>([]),
};

export class IdpStatGroup extends typedElement(props) {
  protected override render(): unknown {
    const logic: StatGroupLogic = { stats: () => this.stats };
    return useView(StatGroupView)(logic);
  }
}

defineCustomElement('idp-stat-group', IdpStatGroup);

declare global {
  interface HTMLElementTagNameMap {
    'idp-stat-group': IdpStatGroup;
  }
  interface JSXCustomElements {
    'idp-stat-group': ElementAttributes<typeof props>;
  }
}
