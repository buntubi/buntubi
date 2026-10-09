/** The scope states as coloured samples, so a reader can tell a card's badge at a glance. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { ScopeState } from '../permissions/logic.js';
import { useView } from '../view.js';
import type { PermissionLegendLogic } from './logic.js';
import { PermissionLegendView } from './view.js';

const ORDER: ScopeState[] = ['available', 'sandbox', 'waiting', 'restricted', 'live'];

const props = {
  /** Each state's name. */
  states: prop.object<Partial<Record<ScopeState, string>>>({}),
  label: prop.string('Legend'),
};

export class IdpPermissionLegend extends typedElement(props) {
  protected override render(): unknown {
    const logic: PermissionLegendLogic = {
      entries: () => ORDER.filter((state) => this.states[state]).map((state) => ({ state, label: this.states[state] ?? state })),
      label: () => this.label,
    };
    return useView(PermissionLegendView)(logic);
  }
}

defineCustomElement('idp-permission-legend', IdpPermissionLegend);

declare global {
  interface HTMLElementTagNameMap {
    'idp-permission-legend': IdpPermissionLegend;
  }
  interface JSXCustomElements {
    'idp-permission-legend': ElementAttributes<typeof props>;
  }
}
