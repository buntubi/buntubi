/** The steps of a flow, the current one marked, the finished ones ticked. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { StepEntry, StepIndicatorLogic } from './logic.js';
import { StepIndicatorView } from './view.js';

const props = {
  steps: prop.object<StepEntry[]>([]),
  /** What the list is, for assistive technology. */
  label: prop.string('Steps'),
};

export class IdpStepIndicator extends typedElement(props) {
  protected override render(): unknown {
    const logic: StepIndicatorLogic = { steps: () => this.steps, label: () => this.label };
    return useView(StepIndicatorView)(logic);
  }
}

defineCustomElement('idp-step-indicator', IdpStepIndicator);

declare global {
  interface HTMLElementTagNameMap {
    'idp-step-indicator': IdpStepIndicator;
  }
  interface JSXCustomElements {
    'idp-step-indicator': ElementAttributes<typeof props>;
  }
}
