/** The apps waiting for a review, oldest first, apart from how the list looks. */
import type { ReviewRequest } from '@buntubi/sdk/types';

export interface ReviewQueueLabels {
  app: string;
  organization: string;
  scopes: string;
  waiting: string;
  open: string;
  empty: string;
  /** "{days} d", "{hours} h": how long the app has waited. */
  days: string;
  hours: string;
}

export const reviewQueueLabels: ReviewQueueLabels = {
  app: 'App',
  organization: 'Organization',
  scopes: 'Sensitive scopes',
  waiting: 'Waiting',
  open: 'Review',
  empty: 'No app is waiting for a review.',
  days: '{n} d',
  hours: '{n} h',
};

export interface QueueRow extends ReviewRequest {
  href: string;
  waited: string;
}

export interface ReviewQueueLogic {
  labels: () => ReviewQueueLabels;
  rows: () => QueueRow[];
}
