/** Where the review stands now: the reviewer's last note and what it concerns, and what to do next. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { AppReview, Stage } from '@buntubi/sdk/types';
import { useView } from '../view.js';
import { reviewRequestLabels, type ReviewRequestLabels, type ReviewRequestLogic } from './logic.js';
import { ReviewRequestView } from './view.js';

const props = {
  stage: prop.string('draft'),
  /** The app's reviews, the latest first: the last answer is read from them. */
  reviews: prop.object<AppReview[]>([]),
  /** The reader's language, for the date. */
  locale: prop.string('en'),
  updateHref: prop.string(''),
  submitHref: prop.string(''),
  /** Whether this member may submit the app. */
  canPublish: prop.boolean(false),
  /** How many scopes wait on a review: with none, the app goes live from its overview instead. */
  waiting: prop.number(0),
  labels: prop.object<Partial<ReviewRequestLabels>>({}),
};

export class IdpReviewRequest extends typedElement(props) {
  protected override render(): unknown {
    const day = new Intl.DateTimeFormat(this.locale, { dateStyle: 'medium', timeZone: 'UTC' });
    // What is shown of the last answer: only while it asks for changes.
    const asked = () => (this.stage === 'changes_requested' ? this.reviews.find((review) => review.decision === 'rejected') : undefined);
    const logic: ReviewRequestLogic = {
      labels: () => ({ ...reviewRequestLabels, ...this.labels }),
      stage: () => this.stage as Stage,
      note: () => asked()?.note ?? '',
      date: () => (asked()?.decided_at ? day.format(new Date(asked()!.decided_at!)) : ''),
      concerns: () => asked()?.scopes ?? [],
      updateHref: () => this.updateHref,
      submitHref: () => this.submitHref,
      canSubmit: () => this.canPublish && this.waiting > 0 && (this.stage === 'draft' || this.stage === 'changes_requested'),
    };
    return useView(ReviewRequestView)(logic);
  }
}

defineCustomElement('idp-review-request', IdpReviewRequest);

declare global {
  interface HTMLElementTagNameMap {
    'idp-review-request': IdpReviewRequest;
  }
  interface JSXCustomElements {
    'idp-review-request': ElementAttributes<typeof props>;
  }
}
