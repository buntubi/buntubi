/** A segmented choice: a filter, an environment, a tab strip. Reports the pick; keeps nothing. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { SegmentedEvents, SegmentedLogic, SegmentedOption } from './logic.js';
import { SegmentedView } from './view.js';

const props = {
  options: prop.object<SegmentedOption[]>([]),
  value: prop.string(''),
  /** What the choice is about, for assistive technology. */
  label: prop.string(''),
  /** "sm" in toolbars, "md" beside a page title. */
  size: prop.string('sm'),
};

export class IdpSegmented extends typedElement(props) {
  protected override render(): unknown {
    const logic: SegmentedLogic = {
      label: () => this.label,
      options: () => this.options,
      value: () => this.value,
      size: () => this.size,
      choose: (value) => {
        if (value && value !== this.value) this.emit('change', { value });
      },
    };
    return useView(SegmentedView)(logic);
  }
}

defineCustomElement('idp-segmented', IdpSegmented);

declare global {
  interface HTMLElementTagNameMap {
    'idp-segmented': IdpSegmented;
  }
  interface JSXCustomElements {
    'idp-segmented': ElementAttributes<typeof props, SegmentedEvents>;
  }
}
