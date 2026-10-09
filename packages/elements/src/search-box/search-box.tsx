/** A search over a list. Keeps what is typed; reports the query when submitted. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { useView } from '../view.js';
import type { SearchBoxEvents, SearchBoxLogic } from './logic.js';
import { SearchBoxView } from './view.js';

const props = {
  /** What the list was searched for, so a reload shows it. */
  query: prop.string(''),
  label: prop.string('Search'),
  button: prop.string('Search'),
};

export class IdpSearchBox extends typedElement(props) {
  protected override render(): unknown {
    const query = signal(this.query);
    const logic: SearchBoxLogic = {
      label: () => this.label,
      button: () => this.button,
      query,
      edit: (value) => query.set(value),
      submit: () => this.emit('search', { q: query().trim() }),
    };
    return useView(SearchBoxView)(logic);
  }
}

defineCustomElement('idp-search-box', IdpSearchBox);

declare global {
  interface HTMLElementTagNameMap {
    'idp-search-box': IdpSearchBox;
  }
  interface JSXCustomElements {
    'idp-search-box': ElementAttributes<typeof props, SearchBoxEvents>;
  }
}
