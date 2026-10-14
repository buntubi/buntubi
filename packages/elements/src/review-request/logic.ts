/** The review's current state as a card: the last answer, what it concerns, the next step; apart from the look. */
import type { Stage } from '@buntu/sdk/types';

export interface ReviewRequestLabels {
  titles: Record<Stage, string>;
  texts: Record<Stage, string>;
  concerns: string;
  reviewer: string;
  update: string;
  submit: string;
  resubmit: string;
}

export const reviewRequestLabels: ReviewRequestLabels = {
  titles: {
    draft: 'Not submitted yet',
    in_review: 'In review',
    changes_requested: 'Changes requested',
    live: 'Live',
  },
  texts: {
    draft: 'The app works in the sandbox for your team and test users. Submit it when every required item is in place.',
    in_review: 'The platform team is reviewing the app. The answer comes here and by email.',
    changes_requested: '',
    live: 'The app is live for everyone.',
  },
  concerns: 'Concerns',
  reviewer: 'R',
  update: 'Update application',
  submit: 'Prepare the submission',
  resubmit: 'Resubmit for review',
};

export interface ReviewRequestLogic {
  labels: () => ReviewRequestLabels;
  stage: () => Stage;
  note: () => string;
  date: () => string;
  concerns: () => string[];
  updateHref: () => string;
  submitHref: () => string;
  canSubmit: () => boolean;
}
