/** Submitting an app for review: what is complete, why each sensitive scope, how to try it; apart from the look. */
import type { Check } from '@buntu/sdk/types';

export interface ReviewSubmissionLabels {
  checks: Record<Check['key'], string>;
  complete: string;
  permissions: string;
  /** "{done} of {total} explained". */
  explained: string;
  question: string;
  hint: string;
  explainedLabel: string;
  missingLabel: string;
  instructions: string;
  instructionsHint: string;
  submit: string;
  resubmit: string;
  submitted: string;
  missing: string;
  noReviewNeeded: string;
  error: string;
}

export const reviewSubmissionLabels: ReviewSubmissionLabels = {
  checks: {
    basic_info: 'Application information',
    redirect_uri: 'Redirect URIs',
    products: 'API products',
    policies: 'Privacy policy and terms',
    support_email: 'Support email',
    permissions: 'Permissions',
    review: 'Review',
  },
  complete: '✓ Complete',
  permissions: 'Requested permissions',
  explained: '{done} of {total} explained',
  question: 'Why does your application need {scope}?',
  hint: 'What it does with the data, and the screen where people meet it.',
  explainedLabel: '✓ Explained',
  missingLabel: 'Required',
  instructions: 'How to try the app',
  instructionsHint: 'A test account and the steps to reach the features that use these scopes.',
  submit: 'Submit for review',
  resubmit: 'Resubmit for review',
  submitted: 'Submitted. The review is under way.',
  missing: 'Still missing:',
  noReviewNeeded: 'This app asks for no scope that needs a review: it goes live from its overview.',
  error: 'Something went wrong. Try again.',
};

export interface ReviewSubmissionLogic {
  labels: () => ReviewSubmissionLabels;
  completed: () => { key: string; label: string; detail: string }[];
  waiting: () => { scope: string; description: string }[];
  explainedLine: () => string;
  allExplained: () => boolean;
  justification: (scope: string) => string;
  justify: (scope: string, text: string) => void;
  instructions: () => string;
  editInstructions: (text: string) => void;
  canSubmit: () => boolean;
  submitLabel: () => string;
  submit: () => Promise<void>;
  submitted: () => boolean;
  missing: () => string[];
  busy: () => boolean;
  error: () => string | null;
}

export interface ReviewSubmissionEvents {
  /** The request is in; the host shows the review's status. */
  submitted: Record<string, never>;
}
