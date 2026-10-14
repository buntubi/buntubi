/** Where an app's review stands, as a strip of stages; apart from the look. */
import type { Stage } from '@buntu/sdk/types';

export type StripStage = 'draft' | 'submitted' | 'in_review' | 'changes_requested' | 'approved' | 'live';
export type StripState = 'passed' | 'current' | 'ahead';

export interface ReviewStagesLabels {
  label: string;
  stages: Record<StripStage, string>;
}

export const reviewStagesLabels: ReviewStagesLabels = {
  label: 'Review stages',
  stages: {
    draft: 'Draft',
    submitted: 'Submitted',
    in_review: 'In review',
    changes_requested: 'Changes requested',
    approved: 'Approved',
    live: 'Live',
  },
};

const ORDER: StripStage[] = ['draft', 'submitted', 'in_review', 'changes_requested', 'approved', 'live'];
const AT: Record<Stage, StripStage> = { draft: 'draft', in_review: 'in_review', changes_requested: 'changes_requested', live: 'live' };

/** Each stage of the strip against the app's: passed, current, or ahead. A live app skipped no step but changes. */
export function stripOf(stage: Stage): { stage: StripStage; state: StripState }[] {
  const at = ORDER.indexOf(AT[stage]);
  return ORDER.map((entry, index) => ({
    stage: entry,
    state: index === at ? 'current' : index < at && !(stage === 'live' && entry === 'changes_requested') ? 'passed' : 'ahead',
  }));
}

export interface ReviewStagesLogic {
  labels: () => ReviewStagesLabels;
  stages: () => { stage: StripStage; state: StripState }[];
}
