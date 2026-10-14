/** Where an app stands on its way to live, as eight steps; apart from the look. */
import type { AppOverview } from '@buntu/sdk/types';

export type StepKey = 'create' | 'configure' | 'apis' | 'scopes' | 'verify' | 'submit' | 'approved' | 'live';
export type StepState = 'done' | 'now' | 'warn' | 'todo';

export interface Step {
  key: StepKey;
  state: StepState;
}

const ORDER: StepKey[] = ['create', 'configure', 'apis', 'scopes', 'verify', 'submit', 'approved', 'live'];

/** Each step's state from the overview: done ones, the one the app is on, the rest. */
export function stepsOf(overview: AppOverview): Step[] {
  const state = (key: string) => overview.checks.find((check) => check.key === key)?.state;
  const submitted = overview.stage === 'in_review' || overview.stage === 'live';
  const done: Record<StepKey, boolean> = {
    create: true,
    configure: state('basic_info') === 'done' && state('redirect_uri') === 'done',
    apis: state('products') === 'done',
    scopes: state('permissions') !== 'todo',
    verify: state('policies') === 'done' && state('support_email') === 'done',
    submit: submitted,
    approved: overview.stage === 'live',
    live: overview.stage === 'live',
  };
  const current = ORDER.find((key) => !done[key]);
  return ORDER.map((key) => ({
    key,
    state: done[key] ? 'done' : key !== current ? 'todo' : key === 'submit' && overview.stage === 'changes_requested' ? 'warn' : 'now',
  }));
}

export interface PathToLiveLabels {
  title: string;
  /** "Step {n} of {total}". */
  stepOf: string;
  steps: Record<StepKey, string>;
}

export const pathToLiveLabels: PathToLiveLabels = {
  title: 'Path to live',
  stepOf: 'Step {n} of {total}',
  steps: {
    create: 'Create',
    configure: 'Configure',
    apis: 'Select APIs',
    scopes: 'Request scopes',
    verify: 'Verify',
    submit: 'Submit for review',
    approved: 'Approved',
    live: 'Live',
  },
};

export interface PathToLiveLogic {
  labels: () => PathToLiveLabels;
  steps: () => Step[];
  position: () => string;
}
