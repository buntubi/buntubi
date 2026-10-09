/** What a page shows when its data or its render failed: what happened, and a way to retry. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import { pageErrorLabels, type PageErrorLabels, type PageErrorLogic, type PageErrorEvents } from './logic.js';
import { PageErrorView } from './view.js';

const props = {
  /** What happened, in the reader's words. */
  message: prop.string(''),
  labels: prop.object<Partial<PageErrorLabels>>({}),
};

export class IdpPageError extends typedElement(props) {
  protected override render(): unknown {
    const logic: PageErrorLogic = {
      labels: () => ({ ...pageErrorLabels, ...this.labels }),
      message: () => this.message,
      retry: () => this.emit('retry', {}),
    };
    return useView(PageErrorView)(logic);
  }
}

defineCustomElement('idp-page-error', IdpPageError);

declare global {
  interface HTMLElementTagNameMap {
    'idp-page-error': IdpPageError;
  }
  interface JSXCustomElements {
    'idp-page-error': ElementAttributes<typeof props, PageErrorEvents>;
  }
}
