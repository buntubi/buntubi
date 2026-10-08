/** One app's review from the reviewer's side: what to check, and the answer. */
import type { AppReview, ReviewRequest } from '@idp/sdk/types';

export interface ReviewDecisionLabels {
  organization: string;
  owner: string;
  support: string;
  none: string;
  consent: string;
  /** "{app} wants to access your {platform} account". */
  consentText: string;
  links: string;
  homepage: string;
  privacy: string;
  terms: string;
  missing: string;
  redirects: string;
  request: string;
  /** "Why does the app need {scope}?" as the developer answered it. */
  justification: string;
  noJustification: string;
  instructions: string;
  noInstructions: string;
  history: string;
  decisions: Record<AppReview['decision'], string>;
  /** "Submitted on {date} by {name}". */
  submittedOn: string;
  /** "Answered on {date} by {name}". */
  decidedOn: string;
  decision: string;
  note: string;
  noteHint: string;
  approve: string;
  reject: string;
  decided: string;
  notPending: string;
  error: string;
}

export const reviewDecisionLabels: ReviewDecisionLabels = {
  organization: 'Organization',
  owner: 'Owner',
  support: 'Support',
  none: 'None',
  consent: 'Consent screen',
  consentText: '{app} wants to access your {platform} account',
  links: 'Links',
  homepage: 'Homepage',
  privacy: 'Privacy policy',
  terms: 'Terms of service',
  missing: 'missing',
  redirects: 'Redirect URIs',
  request: 'What the app asks for',
  justification: 'Why it needs it',
  noJustification: 'No explanation given.',
  instructions: 'How to try the app',
  noInstructions: 'No instructions given.',
  history: 'History',
  decisions: { pending: 'Waiting', approved: 'Approved', rejected: 'Changes requested' },
  submittedOn: 'Submitted on {date} by {name}',
  decidedOn: 'Answered on {date} by {name}',
  decision: 'Decision',
  note: 'Note for the developer',
  noteHint: 'Required to ask for changes: say what to change.',
  approve: 'Approve and put live',
  reject: 'Ask for changes',
  decided: 'Answer recorded.',
  notPending: 'This app is not waiting for a review.',
  error: 'Something went wrong. Try again.',
};

export interface RequestedScope {
  scope: string;
  description: string;
  justification: string;
}

export interface HistoryLine extends AppReview {
  submittedLine: string;
  decidedLine: string | null;
}

export interface ReviewDecisionLogic {
  labels: () => ReviewDecisionLabels;
  review: () => ReviewRequest | null;
  platform: () => string;
  pending: () => boolean;
  requested: () => RequestedScope[];
  instructions: () => string;
  history: () => HistoryLine[];
  note: () => string;
  editNote: (text: string) => void;
  decide: (approve: boolean) => Promise<void>;
  canReject: () => boolean;
  busy: () => boolean;
  done: () => boolean;
  error: () => string | null;
}

export interface ReviewDecisionEvents {
  /** The answer is recorded; the host goes back to the queue. */
  decided: { client_id: string; approve: boolean };
}
