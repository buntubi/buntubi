/** What in an organization waits on its members; apart from the look. */
import type { AttentionTone } from '../attention-item/logic.js';

export interface NeedsAttentionLabels {
  title: string;
  empty: string;
  /** "{app}: changes requested". */
  changes: string;
  /** "{app} is in review". */
  inReview: string;
  inReviewText: string;
}

export const needsAttentionLabels: NeedsAttentionLabels = {
  title: 'Needs attention',
  empty: 'Nothing waits on you.',
  changes: '{app}: changes requested',
  inReview: '{app} is in review',
  inReviewText: 'The platform team answers here and by email.',
};

/** An app as this block reads it. */
export interface AttentionApp {
  client_id: string;
  name: string;
  href: string;
  review_status: string;
  review_note: string | null;
}

export interface AttentionEntry {
  key: string;
  title: string;
  text: string;
  href: string;
  tone: AttentionTone;
}

export interface NeedsAttentionLogic {
  labels: () => NeedsAttentionLabels;
  items: () => AttentionEntry[];
}
