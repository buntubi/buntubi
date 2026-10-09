/** An app's review history as a timeline; apart from the look. */
import type { HistoryTone } from '../history-entry/logic.js';

export interface ReviewHistoryLabels {
  title: string;
  empty: string;
  submitted: string;
  inReview: string;
  approved: string;
  rejected: string;
  reviewer: string;
  /** "Submission {n}". */
  submission: string;
}

export const reviewHistoryLabels: ReviewHistoryLabels = {
  title: 'History',
  empty: 'No review yet.',
  submitted: 'Submitted for review',
  inReview: 'In review',
  approved: 'Approved and live',
  rejected: 'Changes requested',
  reviewer: 'Reviewer',
  submission: 'submission {n}',
};

export interface TimelineEntry {
  key: string;
  title: string;
  meta: string;
  text: string;
  scopes: string[];
  date: string;
  tone: HistoryTone;
}

export interface ReviewHistoryLogic {
  labels: () => ReviewHistoryLabels;
  entries: () => TimelineEntry[];
}
