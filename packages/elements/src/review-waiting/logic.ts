/** The apps waiting for an answer, as a short card; apart from the look. */

export interface ReviewWaitingLabels {
  title: string;
  empty: string;
  open: string;
}

export const reviewWaitingLabels: ReviewWaitingLabels = {
  title: 'Waiting for an answer',
  empty: 'No app is waiting for a review.',
  open: 'Review',
};

export interface WaitingEntry {
  client_id: string;
  name: string;
  organization: string;
  scopes: string[];
  href: string;
}

export interface ReviewWaitingLogic {
  labels: () => ReviewWaitingLabels;
  entries: () => WaitingEntry[];
}
