/** What waits on the organization: reviews that asked for changes first, then reviews under way. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import '../attention-item/attention-item.js';
import { useView } from '../view.js';
import { needsAttentionLabels, type AttentionApp, type NeedsAttentionLabels, type NeedsAttentionLogic } from './logic.js';
import { NeedsAttentionView } from './view.js';

const props = {
  apps: prop.object<AttentionApp[]>([]),
  labels: prop.object<Partial<NeedsAttentionLabels>>({}),
};

export class IdpNeedsAttention extends typedElement(props) {
  protected override render(): unknown {
    const labels = () => ({ ...needsAttentionLabels, ...this.labels });
    const logic: NeedsAttentionLogic = {
      labels,
      items: () => [
        ...this.apps
          .filter((app) => app.review_status === 'rejected')
          .map((app) => ({
            key: `changes:${app.client_id}`,
            title: labels().changes.replace('{app}', app.name),
            text: app.review_note ?? '',
            href: app.href,
            tone: 'warn' as const,
          })),
        ...this.apps
          .filter((app) => app.review_status === 'pending')
          .map((app) => ({
            key: `review:${app.client_id}`,
            title: labels().inReview.replace('{app}', app.name),
            text: labels().inReviewText,
            href: app.href,
            tone: 'info' as const,
          })),
      ],
    };
    return useView(NeedsAttentionView)(logic);
  }
}

defineCustomElement('idp-needs-attention', IdpNeedsAttention);

declare global {
  interface HTMLElementTagNameMap {
    'idp-needs-attention': IdpNeedsAttention;
  }
  interface JSXCustomElements {
    'idp-needs-attention': ElementAttributes<typeof props>;
  }
}
