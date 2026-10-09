/** A product's scopes: its name, a way to its details, and one `idp-scope-card` per scope. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { ScopeCard, ScopeState } from '../permissions/logic.js';
import '../scope-card/scope-card.js';
import { useView } from '../view.js';
import type { ScopeGroupEvents, ScopeGroupLogic } from './logic.js';
import { ScopeGroupView } from './view.js';

const props = {
  name: prop.string(''),
  scopes: prop.object<ScopeCard[]>([]),
  /** Each state's name, for the cards' badges. */
  states: prop.object<Partial<Record<ScopeState, string>>>({}),
  detailsHref: prop.string(''),
  detailsLabel: prop.string('Product details'),
};

export class IdpScopeGroup extends typedElement(props) {
  protected override render(): unknown {
    const logic: ScopeGroupLogic = {
      name: () => this.name,
      scopes: () => this.scopes,
      stateLabel: (scope) => this.states[scope.state] ?? scope.state,
      detailsHref: () => this.detailsHref,
      detailsLabel: () => this.detailsLabel,
      toggle: (scope) => this.emit('toggle', { scope }),
    };
    return useView(ScopeGroupView)(logic);
  }
}

defineCustomElement('idp-scope-group', IdpScopeGroup);

declare global {
  interface HTMLElementTagNameMap {
    'idp-scope-group': IdpScopeGroup;
  }
  interface JSXCustomElements {
    'idp-scope-group': ElementAttributes<typeof props, ScopeGroupEvents>;
  }
}
