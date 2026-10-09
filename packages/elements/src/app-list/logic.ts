/** The app list's data, words and behaviour, apart from how it looks. */
import type { Environment, ReviewStatus } from '@idp/sdk/types';

export interface AppRow {
  client_id: string;
  name: string;
  /** Where a row leads. */
  href: string;
  environment: Environment;
  review_status: ReviewStatus;
  /** The products the app uses, as the reader names them. */
  apis: string[];
}

export type AppStatus = 'live' | 'in_review' | 'changes_requested' | 'draft';
/** The board's filters: changes requested counts as in review. */
export type AppFilter = 'all' | 'live' | 'in_review' | 'draft';

/** Where an app stands, as the list shows it. */
export function statusOf(app: Pick<AppRow, 'environment' | 'review_status'>): AppStatus {
  if (app.environment === 'live') return 'live';
  if (app.review_status === 'pending') return 'in_review';
  if (app.review_status === 'rejected') return 'changes_requested';
  return 'draft';
}

export interface AppListLabels {
  title: string;
  app: string;
  status: string;
  apis: string;
  empty: string;
  filters: Record<AppFilter, string>;
  statuses: Record<AppStatus, string>;
  environments: Record<Environment, string>;
}

export const appListLabels: AppListLabels = {
  title: 'My applications',
  app: 'App',
  status: 'Status',
  apis: 'APIs',
  empty: 'No app yet.',
  filters: { all: 'All', live: 'Live', in_review: 'In review', draft: 'Draft' },
  statuses: { live: 'Live', in_review: 'In review', changes_requested: 'Changes requested', draft: 'Draft' },
  environments: { sandbox: 'Sandbox', live: 'Production' },
};

export interface AppListLogic {
  labels: () => AppListLabels;
  filter: () => AppFilter;
  filters: () => { value: string; label: string }[];
  choose: (filter: string) => void;
  rows: () => (AppRow & { status: AppStatus })[];
}
