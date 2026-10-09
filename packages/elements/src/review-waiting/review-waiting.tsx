/** The apps waiting for a review, one `idp-waiting-app` each, under a heading. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { ReviewRequest } from '@idp/sdk/types';
import '../waiting-app/waiting-app.js';
import { useView } from '../view.js';
import { reviewWaitingLabels, type ReviewWaitingLabels, type ReviewWaitingLogic } from './logic.js';
import { ReviewWaitingView } from './view.js';

const props = {
  reviews: prop.object<ReviewRequest[]>([]),
  /** Where one review opens; `{client_id}` is replaced. */
  href: prop.string('/reviews/{client_id}'),
  labels: prop.object<Partial<ReviewWaitingLabels>>({}),
};

export class IdpReviewWaiting extends typedElement(props) {
  protected override render(): unknown {
    const logic: ReviewWaitingLogic = {
      labels: () => ({ ...reviewWaitingLabels, ...this.labels }),
      entries: () =>
        this.reviews.map((review) => ({
          client_id: review.client_id,
          name: review.name,
          organization: review.organization?.name ?? '',
          scopes: review.sensitive_scopes,
          href: this.href.replace('{client_id}', encodeURIComponent(review.client_id)),
        })),
    };
    return useView(ReviewWaitingView)(logic);
  }
}

defineCustomElement('idp-review-waiting', IdpReviewWaiting);

declare global {
  interface HTMLElementTagNameMap {
    'idp-review-waiting': IdpReviewWaiting;
  }
  interface JSXCustomElements {
    'idp-review-waiting': ElementAttributes<typeof props>;
  }
}
