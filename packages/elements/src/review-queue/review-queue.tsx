/** The apps waiting for the platform owner's answer, the longest waiting first. Read only. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { ReviewRequest } from '@idp/sdk/types';
import { useView } from '../view.js';
import { reviewQueueLabels, type ReviewQueueLabels, type ReviewQueueLogic } from './logic.js';
import { ReviewQueueView } from './view.js';

const props = {
  reviews: prop.object<ReviewRequest[]>([]),
  /** Where one review opens; `{client_id}` is replaced. */
  href: prop.string('/reviews/{client_id}'),
  /** When the list was loaded, so the server and the browser count the same wait. */
  now: prop.string(''),
  labels: prop.object<Partial<ReviewQueueLabels>>({}),
};

export class IdpReviewQueue extends typedElement(props) {
  protected override render(): unknown {
    const labels = () => ({ ...reviewQueueLabels, ...this.labels });
    const waited = (since: string) => {
      const hours = Math.max(0, Math.floor((Date.parse(this.now || since) - Date.parse(since)) / 3_600_000));
      return hours >= 24 ? labels().days.replace('{n}', String(Math.floor(hours / 24))) : labels().hours.replace('{n}', String(hours));
    };
    const logic: ReviewQueueLogic = {
      labels,
      rows: () =>
        [...this.reviews]
          .sort((a, b) => Date.parse(a.requested_at) - Date.parse(b.requested_at))
          .map((review) => ({
            ...review,
            href: this.href.replace('{client_id}', encodeURIComponent(review.client_id)),
            waited: waited(review.requested_at),
          })),
    };
    return useView(ReviewQueueView)(logic);
  }
}

defineCustomElement('idp-review-queue', IdpReviewQueue);

declare global {
  interface HTMLElementTagNameMap {
    'idp-review-queue': IdpReviewQueue;
  }
  interface JSXCustomElements {
    'idp-review-queue': ElementAttributes<typeof props>;
  }
}
