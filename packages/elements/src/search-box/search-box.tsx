/** A search over a list. Reports the query as the typing pauses, or at once on Enter. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { onCleanup, signal } from '@fluixi/reactive/signal';
import { useView } from '../view.js';
import type { SearchBoxEvents, SearchBoxLogic } from './logic.js';
import { SearchBoxView } from './view.js';

const props = {
  /** What the list was searched for, so a reload shows it. */
  query: prop.string(''),
  label: prop.string('Search'),
  /** How long typing has to pause before the search is reported, in milliseconds. */
  delay: prop.number(250),
};

export class IdpSearchBox extends typedElement(props) {
  protected override render(): unknown {
    const query = signal(this.query);
    let reported = this.query.trim();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const report = () => {
      clearTimeout(timer);
      const q = query().trim();
      if (q === reported) return;
      reported = q;
      this.emit('search', { q });
    };
    onCleanup(() => clearTimeout(timer));
    const logic: SearchBoxLogic = {
      label: () => this.label,
      query,
      edit: (value) => {
        query.set(value);
        clearTimeout(timer);
        timer = setTimeout(report, this.delay);
      },
      submit: report,
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
