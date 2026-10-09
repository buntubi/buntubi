/** The reviewer's last note on an app, as a callout. Renders nothing without a note. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { ReviewNoteLogic } from './logic.js';
import { ReviewNoteView } from './view.js';

const props = {
  note: prop.string(''),
  title: prop.string('Reviewer feedback'),
};

export class IdpReviewNote extends typedElement(props) {
  protected override render(): unknown {
    const logic: ReviewNoteLogic = { title: () => this.title, note: () => this.note };
    return useView(ReviewNoteView)(logic);
  }
}

defineCustomElement('idp-review-note', IdpReviewNote);

declare global {
  interface HTMLElementTagNameMap {
    'idp-review-note': IdpReviewNote;
  }
  interface JSXCustomElements {
    'idp-review-note': ElementAttributes<typeof props>;
  }
}
