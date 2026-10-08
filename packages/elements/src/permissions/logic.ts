/** What an app may ask of its users, by API product, apart from how it looks. */

/**
 * Where a scope stands for the app: `live` works for everyone, `waiting` needs a review before
 * it does, `sandbox` works for the team and test users only, `added` is selected and not saved
 * yet, `available` can be asked for, `restricted` only the platform grants.
 */
export type ScopeState = 'live' | 'waiting' | 'sandbox' | 'added' | 'available' | 'restricted';

export interface ScopeCard {
  name: string;
  description: string;
  sensitive: boolean;
  state: ScopeState;
  selected: boolean;
  /** Not something the reader can change here: `openid`, or a restricted scope. */
  locked: boolean;
}

export interface PermissionGroup {
  slug: string;
  name: string;
  description: string;
  scopes: ScopeCard[];
}

export interface PermissionsLabels {
  intro: string;
  states: Record<ScopeState, string>;
  sensitive: string;
  summaryTitle: string;
  /** "{selected} selected, {review} need a review before production." */
  summary: string;
  reviewNote: string;
  sandboxNote: string;
  save: string;
  saved: string;
  toReview: string;
  empty: string;
  error: string;
}

export const permissionsLabels: PermissionsLabels = {
  intro:
    'Permissions decide what your app can read or do for the people who sign in. Sensitive ones go through a review before they work in production.',
  states: {
    live: 'Approved',
    waiting: 'Needs review',
    sandbox: 'Sandbox only',
    added: 'Not saved',
    available: 'Available',
    restricted: 'Restricted',
  },
  sensitive: 'Sensitive',
  summaryTitle: 'Requested access',
  summary: '{selected} selected, {review} need a review before production.',
  reviewNote: 'For each one, the review asks why your app needs it and where people meet it.',
  sandboxNote: 'In the sandbox every selected scope works for you and your test users.',
  save: 'Save permissions',
  saved: 'Saved',
  toReview: 'Go to the path to live',
  empty: 'No API product is available yet.',
  error: 'Something went wrong. Try again.',
};

export interface PermissionsLogic {
  labels: () => PermissionsLabels;
  groups: () => PermissionGroup[];
  toggle: (scope: string) => void;
  /** The selected scopes needing a review, saved or not. */
  needsReview: () => string[];
  selectedCount: () => number;
  changed: () => boolean;
  canEdit: () => boolean;
  save: () => Promise<void>;
  busy: () => boolean;
  saved: () => boolean;
  error: () => string | null;
  reviewHref: () => string;
}
