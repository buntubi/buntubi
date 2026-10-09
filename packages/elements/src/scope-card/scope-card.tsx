/** One scope: picked or not, its name and what it allows, and where it stands for the app. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { ScopeState } from '../permissions/logic.js';
import { useView } from '../view.js';
import type { ScopeCardEvents, ScopeCardLogic } from './logic.js';
import { ScopeCardView } from './view.js';

const props = {
  name: prop.string(''),
  text: prop.string(''),
  state: prop.string('available'),
  stateLabel: prop.string(''),
  selected: prop.boolean(false),
  /** Not the reader's to change: always on, the platform's own, or no right to edit. */
  locked: prop.boolean(false),
};

export class IdpScopeCard extends typedElement(props) {
  protected override render(): unknown {
    const logic: ScopeCardLogic = {
      name: () => this.name,
      text: () => this.text,
      state: () => this.state as ScopeState,
      stateLabel: () => this.stateLabel,
      selected: () => this.selected,
      locked: () => this.locked,
      toggle: () => {
        if (!this.locked) this.emit('toggle', {});
      },
    };
    return useView(ScopeCardView)(logic);
  }
}

defineCustomElement('idp-scope-card', IdpScopeCard);

declare global {
  interface HTMLElementTagNameMap {
    'idp-scope-card': IdpScopeCard;
  }
  interface JSXCustomElements {
    'idp-scope-card': ElementAttributes<typeof props, ScopeCardEvents>;
  }
}
