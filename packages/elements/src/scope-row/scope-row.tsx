/** One scope: its name, what consent says for it, its API and how sensitive it is. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { ScopeEntry } from '@buntubi/sdk/types';
import { useView } from '../view.js';
import { scopeRowLabels, type ScopeRowLabels, type ScopeRowLogic } from './logic.js';
import { ScopeRowView } from './view.js';

const props = {
  scope: prop.object<ScopeEntry | null>(null),
  /** Which description to show. */
  locale: prop.string('en'),
  labels: prop.object<Partial<ScopeRowLabels>>({}),
};

export class IdpScopeRow extends typedElement(props) {
  protected override render(): unknown {
    const logic: ScopeRowLogic = {
      labels: () => ({ ...scopeRowLabels, ...this.labels }),
      name: () => this.scope?.name ?? '',
      description: () => this.scope?.descriptions[this.locale as 'fr' | 'en'] ?? this.scope?.descriptions.en ?? '',
      resource: () => this.scope?.resource ?? '',
      sensitivity: () => this.scope?.sensitivity ?? 'public',
    };
    return useView(ScopeRowView)(logic);
  }
}

defineCustomElement('idp-scope-row', IdpScopeRow);

declare global {
  interface HTMLElementTagNameMap {
    'idp-scope-row': IdpScopeRow;
  }
  interface JSXCustomElements {
    'idp-scope-row': ElementAttributes<typeof props>;
  }
}
