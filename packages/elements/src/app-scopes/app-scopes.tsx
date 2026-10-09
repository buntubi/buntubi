/** An app's scopes by stage: live, waiting for a review, sandbox only. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import { appScopesLabels, type AppScopesLabels, type AppScopesLogic, type StageScopes } from './logic.js';
import { AppScopesView } from './view.js';

const props = {
  scopes: prop.object<StageScopes | null>(null),
  /** Where the permissions are changed; none hides the link. */
  manageHref: prop.string(''),
  labels: prop.object<Partial<AppScopesLabels>>({}),
};

const STAGES = ['live', 'waiting', 'sandbox'] as const;

export class IdpAppScopes extends typedElement(props) {
  protected override render(): unknown {
    const labels = () => ({ ...appScopesLabels, ...this.labels });
    const logic: AppScopesLogic = {
      labels,
      manageHref: () => this.manageHref,
      rows: () => STAGES.map((key) => ({ key, label: labels()[key], scopes: this.scopes?.[key] ?? [] })),
    };
    return useView(AppScopesView)(logic);
  }
}

defineCustomElement('idp-app-scopes', IdpAppScopes);

declare global {
  interface HTMLElementTagNameMap {
    'idp-app-scopes': IdpAppScopes;
  }
  interface JSXCustomElements {
    'idp-app-scopes': ElementAttributes<typeof props>;
  }
}
