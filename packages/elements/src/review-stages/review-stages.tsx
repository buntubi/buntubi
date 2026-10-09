/** The review's stages in a strip: the ones passed ticked, the current one marked. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { Stage } from '@idp/sdk/types';
import { useView } from '../view.js';
import { reviewStagesLabels, stripOf, type ReviewStagesLabels, type ReviewStagesLogic } from './logic.js';
import { ReviewStagesView } from './view.js';

const props = {
  stage: prop.string('draft'),
  labels: prop.object<Partial<ReviewStagesLabels>>({}),
};

export class IdpReviewStages extends typedElement(props) {
  protected override render(): unknown {
    const logic: ReviewStagesLogic = {
      labels: () => ({ ...reviewStagesLabels, ...this.labels }),
      stages: () => stripOf(this.stage as Stage),
    };
    return useView(ReviewStagesView)(logic);
  }
}

defineCustomElement('idp-review-stages', IdpReviewStages);

declare global {
  interface HTMLElementTagNameMap {
    'idp-review-stages': IdpReviewStages;
  }
  interface JSXCustomElements {
    'idp-review-stages': ElementAttributes<typeof props>;
  }
}
