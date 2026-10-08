/** An app's review, the developer's side: readiness, the submission, its status and history. */
import type { AppReview, Check, Stage } from '@idp/sdk/types';

export interface AppReviewLabels {
  readiness: string;
  /** "{done} of {total} required items". */
  readinessCount: string;
  ready: string;
  checks: Record<Check['key'], string>;
  fix: string;
  status: string;
  stages: Record<Stage, string>;
  stageTexts: Record<Stage, string>;
  feedback: string;
  submission: string;
  submissionIntro: string;
  noReviewNeeded: string;
  /** "Why does the app need {scope}?" */
  justify: string;
  justifyHint: string;
  instructions: string;
  instructionsHint: string;
  submit: string;
  resubmit: string;
  submitted: string;
  missing: string;
  history: string;
  /** What opens a past submission's details. */
  showSubmission: string;
  noHistory: string;
  decisions: Record<AppReview['decision'], string>;
  /** "Submitted on {date} by {name}". */
  submittedOn: string;
  /** "Answered on {date}". */
  decidedOn: string;
  asked: string;
  error: string;
}

export const appReviewLabels: AppReviewLabels = {
  readiness: 'Readiness',
  readinessCount: '{done} of {total} required items',
  ready: 'Everything a review needs is in place.',
  checks: {
    basic_info: 'Basic information complete',
    redirect_uri: 'Redirect URI configured',
    products: 'API products selected',
    policies: 'Privacy policy and terms linked',
    support_email: 'Support email set',
    permissions: 'Permissions approved',
    review: 'Review',
  },
  fix: 'Fix',
  status: 'Status',
  stages: { draft: 'Draft', in_review: 'In review', changes_requested: 'Changes requested', live: 'Live' },
  stageTexts: {
    draft: 'Not submitted yet. The app works in the sandbox for your team and test users.',
    in_review: 'The platform team is reviewing the app. You will see the answer here.',
    changes_requested: 'The review asked for changes. Fix them, then submit again.',
    live: 'The app is live for everyone.',
  },
  feedback: 'Reviewer feedback',
  submission: 'Submit for review',
  submissionIntro: 'For each sensitive scope, say why the app needs it and where people meet it in the app.',
  noReviewNeeded: 'This app asks for no scope that needs a review: it goes live from its overview.',
  justify: 'Why does the app need {scope}?',
  justifyHint: 'What it does with the data, and the screen where people meet it.',
  instructions: 'How to try the app',
  instructionsHint: 'A test account and the steps to reach the features that use these scopes.',
  submit: 'Submit for review',
  resubmit: 'Submit again',
  submitted: 'Submitted. The review is under way.',
  missing: 'Still missing:',
  history: 'History',
  showSubmission: 'See the submission',
  noHistory: 'No review yet.',
  decisions: { pending: 'In review', approved: 'Approved', rejected: 'Changes requested' },
  submittedOn: 'Submitted on {date} by {name}',
  decidedOn: 'Answered on {date}',
  asked: 'Asked for',
  error: 'Something went wrong. Try again.',
};

export interface ReadinessItem {
  key: Check['key'];
  href: string | null;
}

export interface HistoryEntry extends AppReview {
  submittedLine: string;
  decidedLine: string | null;
}

export interface AppReviewLogic {
  labels: () => AppReviewLabels;
  stage: () => Stage;
  note: () => string;
  percent: () => number;
  readinessCount: () => string;
  openItems: () => ReadinessItem[];
  /** The scopes this submission must explain; empty when no review is needed. */
  waiting: () => { scope: string; description: string }[];
  canSubmit: () => boolean;
  justification: (scope: string) => string;
  justify: (scope: string, text: string) => void;
  instructions: () => string;
  editInstructions: (text: string) => void;
  submit: () => Promise<void>;
  submitLabel: () => string;
  submitted: () => boolean;
  missing: () => string[];
  history: () => HistoryEntry[];
  busy: () => boolean;
  error: () => string | null;
}
