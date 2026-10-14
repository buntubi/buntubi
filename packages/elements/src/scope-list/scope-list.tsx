/** The scope catalogue as a table, one `idp-scope-row` each, filtered by sensitivity, in a card. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import type { ScopeEntry, Sensitivity } from '@buntu/sdk/types';
import '../scope-row/scope-row.js';
import '../segmented/segmented.js';
import type { ScopeRowLabels } from '../scope-row/logic.js';
import { useView } from '../view.js';
import { scopeListLabels, type ScopeListLabels, type ScopeListLogic } from './logic.js';
import { ScopeListView } from './view.js';

const LEVELS: Sensitivity[] = ['public', 'sensitive', 'restricted'];
const DOT: Record<Sensitivity, string> = { public: 'var(--idp-ok)', sensitive: 'var(--idp-warn)', restricted: 'var(--idp-bad)' };

const props = {
  scopes: prop.object<ScopeEntry[]>([]),
  locale: prop.string('en'),
  labels: prop.object<Partial<ScopeListLabels>>({}),
  /** Handed to every row. */
  rowLabels: prop.object<Partial<ScopeRowLabels>>({}),
};

export class IdpScopeList extends typedElement(props) {
  protected override render(): unknown {
    const labels = () => ({ ...scopeListLabels, ...this.labels });
    const filter = signal('all');
    const logic: ScopeListLogic = {
      labels,
      scopes: () => (filter() === 'all' ? this.scopes : this.scopes.filter((scope) => scope.sensitivity === filter())),
      filters: () => [
        { value: 'all', label: labels().all, count: this.scopes.length },
        ...LEVELS.map((level) => ({
          value: level,
          label: labels().sensitivities[level],
          dot: DOT[level],
          count: this.scopes.filter((scope) => scope.sensitivity === level).length,
        })),
      ],
      filter,
      choose: (value) => filter.set(value),
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
