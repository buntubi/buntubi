/** Every submission and every answer, newest first, one `idp-history-entry` each. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { AppReview } from '@idp/sdk/types';
import '../history-entry/history-entry.js';
import { useView } from '../view.js';
import { reviewHistoryLabels, type ReviewHistoryLabels, type ReviewHistoryLogic, type TimelineEntry } from './logic.js';
import { ReviewHistoryView } from './view.js';

const props = {
  /** The latest first. */
  reviews: prop.object<AppReview[]>([]),
  locale: prop.string('en'),
  labels: prop.object<Partial<ReviewHistoryLabels>>({}),
};

export class IdpReviewHistory extends typedElement(props) {
  protected override render(): unknown {
    const labels = () => ({ ...reviewHistoryLabels, ...this.labels });
    const day = new Intl.DateTimeFormat(this.locale, { dateStyle: 'medium', timeZone: 'UTC' });
    const logic: ReviewHistoryLogic = {
      labels,
      entries: () =>
        this.reviews.flatMap((review, index): TimelineEntry[] => {
          const n = labels().submission.replace('{n}', String(this.reviews.length - index));
          const submitted: TimelineEntry = {
            key: `${review.id}:submitted`,
            title: labels().submitted,
            meta: [review.submitted_by?.name || review.submitted_by?.email, n].filter(Boolean).join(' · '),
            text: '',
            scopes: review.scopes,
            date: day.format(new Date(review.submitted_at)),
            tone: 'muted',
          };
          if (review.decision === 'pending') {
            return [{ ...submitted, key: `${review.id}:pending`, title: labels().inReview, tone: 'info' }, submitted];
          }
          const decided: TimelineEntry = {
            key: `${review.id}:decided`,
            title: review.decision === 'approved' ? labels().approved : labels().rejected,
            meta: `${labels().reviewer} · ${n}`,
            text: review.note,
            scopes: review.scopes,
            date: review.decided_at ? day.format(new Date(review.decided_at)) : '',
            tone: review.decision === 'approved' ? 'ok' : 'warn',
          };
          return [decided, submitted];
        }),
    };
    return useView(ReviewHistoryView)(logic);
  }
}

defineCustomElement('idp-review-history', IdpReviewHistory);

declare global {
  interface HTMLElementTagNameMap {
    'idp-review-history': IdpReviewHistory;
  }
  interface JSXCustomElements {
    'idp-review-history': ElementAttributes<typeof props>;
  }
}
