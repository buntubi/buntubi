/** What an app still needs before it can go live, with the reviewer's last word; apart from the look. */
import type { Check } from '@idp/sdk/types';

export type CheckKey = Check['key'];

export interface LaunchChecklistLabels {
  title: string;
  checks: Record<CheckKey, string>;
  /** Field names as the reader knows them. */
  fields: Record<string, string>;
  feedback: string;
  openReview: string;
  fix: string;
  edit: string;
}

export const launchChecklistLabels: LaunchChecklistLabels = {
  title: 'Before going live',
  checks: {
    basic_info: 'Basic information complete',
    redirect_uri: 'Redirect URI configured',
    products: 'API products selected',
    policies: 'Privacy policy and terms linked',
    support_email: 'Support email set',
    permissions: 'Permissions approved',
    review: 'Review',
  },
  fields: {},
  feedback: 'Reviewer feedback',
  openReview: 'Open the review',
  fix: 'Fix',
  edit: 'Edit',
};

export type RowState = 'done' | 'needed' | 'optional';

export interface ChecklistRow {
  key: CheckKey;
  state: RowState;
  label: string;
  detail: string;
  href: string;
  action: string;
}

export interface LaunchChecklistLogic {
  labels: () => LaunchChecklistLabels;
  rows: () => ChecklistRow[];
  note: () => string;
  reviewHref: () => string;
}
