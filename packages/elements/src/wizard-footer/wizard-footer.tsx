/** Back, a line about what happens, and the step forward. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { WizardFooterEvents, WizardFooterLogic } from './logic.js';
import { WizardFooterView } from './view.js';

const props = {
  backLabel: prop.string('Back'),
  nextLabel: prop.string('Continue'),
  note: prop.string(''),
  busy: prop.boolean(false),
};

export class IdpWizardFooter extends typedElement(props) {
  protected override render(): unknown {
    const logic: WizardFooterLogic = {
      backLabel: () => this.backLabel,
      nextLabel: () => this.nextLabel,
      note: () => this.note,
      busy: () => this.busy,
      back: () => this.emit('back', {}),
      next: () => this.emit('next', {}),
    };
    return useView(WizardFooterView)(logic);
  }
}

defineCustomElement('idp-wizard-footer', IdpWizardFooter);

declare global {
  interface HTMLElementTagNameMap {
    'idp-wizard-footer': IdpWizardFooter;
  }
  interface JSXCustomElements {
    'idp-wizard-footer': ElementAttributes<typeof props, WizardFooterEvents>;
  }
}
