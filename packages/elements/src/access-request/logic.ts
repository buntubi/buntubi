/** What an app's picked scopes ask of the review, and the next step; apart from the look. */

export interface AccessRequestLabels {
  title: string;
  /** "{selected} selected, {review} need a review before production." */
  summary: string;
  review: string;
  restricted: string;
  note: string;
  sandboxNote: string;
  save: string;
  saved: string;
  continue: string;
}

export const accessRequestLabels: AccessRequestLabels = {
  title: 'Request additional access',
  summary: '{selected} selected, {review} need a review before production.',
  review: 'Review',
  restricted: 'Restricted',
  note: 'For each one, explain why your app needs it, how it is used and where users meet it.',
  sandboxNote: 'In the sandbox every selected scope works for you and your test users.',
  save: 'Save permissions',
  saved: 'Saved',
  continue: 'Continue to justification',
};

export interface PendingScope {
  name: string;
  restricted: boolean;
}

export interface AccessRequestLogic {
  labels: () => AccessRequestLabels;
  summary: () => string;
  pending: () => PendingScope[];
  /** Unsaved picks: the main action saves them. */
  changed: () => boolean;
  canEdit: () => boolean;
  busy: () => boolean;
  saved: () => boolean;
  error: () => string;
  reviewHref: () => string;
  save: () => void;
}

export interface AccessRequestEvents {
  save: Record<string, never>;
}
