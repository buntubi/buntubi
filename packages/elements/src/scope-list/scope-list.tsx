/** The scope catalogue, one `idp-scope-row` each, in a card. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { ScopeEntry } from '@idp/sdk/types';
import '../scope-row/scope-row.js';
import type { ScopeRowLabels } from '../scope-row/logic.js';
import { useView } from '../view.js';
import type { ScopeListLogic } from './logic.js';
import { ScopeListView } from './view.js';

const props = {
  scopes: prop.object<ScopeEntry[]>([]),
  locale: prop.string('en'),
  title: prop.string('Scopes'),
  empty: prop.string('No scope yet.'),
  /** Handed to every row. */
  rowLabels: prop.object<Partial<ScopeRowLabels>>({}),
};

export class IdpScopeList extends typedElement(props) {
  protected override render(): unknown {
    const logic: ScopeListLogic = {
      title: () => this.title,
      empty: () => this.empty,
      scopes: () => this.scopes,
      locale: () => this.locale,
      rowLabels: () => this.rowLabels,
    };
    return useView(ScopeListView)(logic);
  }
}

defineCustomElement('idp-scope-list', IdpScopeList);

declare global {
  interface HTMLElementTagNameMap {
    'idp-scope-list': IdpScopeList;
  }
  interface JSXCustomElements {
    'idp-scope-list': ElementAttributes<typeof props>;
  }
}
