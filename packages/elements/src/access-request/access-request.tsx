/** The picked scopes that need a review, how many, and the next step: save, then justify them. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import { accessRequestLabels, type AccessRequestEvents, type AccessRequestLabels, type AccessRequestLogic, type PendingScope } from './logic.js';
import { AccessRequestView } from './view.js';

const props = {
  selected: prop.number(0),
  pending: prop.object<PendingScope[]>([]),
  changed: prop.boolean(false),
  canEdit: prop.boolean(false),
  busy: prop.boolean(false),
  saved: prop.boolean(false),
  error: prop.string(''),
  reviewHref: prop.string(''),
  labels: prop.object<Partial<AccessRequestLabels>>({}),
};

export class IdpAccessRequest extends typedElement(props) {
  protected override render(): unknown {
    const labels = () => ({ ...accessRequestLabels, ...this.labels });
    const logic: AccessRequestLogic = {
      labels,
      summary: () => labels().summary.replace('{selected}', String(this.selected)).replace('{review}', String(this.pending.length)),
      pending: () => this.pending,
      changed: () => this.changed,
      canEdit: () => this.canEdit,
      busy: () => this.busy,
      saved: () => this.saved,
      error: () => this.error,
      reviewHref: () => this.reviewHref,
      save: () => this.emit('save', {}),
    };
    return useView(AccessRequestView)(logic);
  }
}

defineCustomElement('idp-access-request', IdpAccessRequest);

declare global {
  interface HTMLElementTagNameMap {
    'idp-access-request': IdpAccessRequest;
  }
  interface JSXCustomElements {
    'idp-access-request': ElementAttributes<typeof props, AccessRequestEvents>;
  }
}
