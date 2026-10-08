/** An app's way to live: the steps, the checklist and going live, apart from how they look. */
import type { AppOverview, Check } from '@idp/sdk/types';

export type StepKey = 'create' | 'configure' | 'apis' | 'scopes' | 'verify' | 'submit' | 'approved' | 'live';
export type StepState = 'done' | 'now' | 'warn' | 'todo';
export type CheckKey = Check['key'];

export interface Step {
  key: StepKey;
  state: StepState;
}

const STEPS: StepKey[] = ['create', 'configure', 'apis', 'scopes', 'verify', 'submit', 'approved', 'live'];

/** Which steps an overview has behind it, and the one it is on. */
export function stepsOf(overview: AppOverview): Step[] {
  const state = (key: CheckKey) => overview.checks.find((check) => check.key === key)?.state ?? 'todo';
  const submitted = overview.stage === 'in_review' || overview.stage === 'live';
  const done: Record<StepKey, boolean> = {
    create: true,
    configure: state('basic_info') === 'done' && state('redirect_uri') === 'done',
    apis: state('products') === 'done',
    // Scopes waiting for a review are asked for: the step is behind the app.
    scopes: state('permissions') !== 'todo',
    verify: state('policies') === 'done' && state('support_email') === 'done',
    submit: submitted,
    approved: overview.stage === 'live',
    live: overview.stage === 'live',
  };
  const current = STEPS.find((key) => !done[key]);
  return STEPS.map((key) => ({
    key,
    state: done[key]
      ? 'done'
      : key !== current
        ? 'todo'
        : key === 'submit' && overview.stage === 'changes_requested'
          ? 'warn'
          : 'now',
  }));
}

export interface LaunchPathLabels {
  path: string;
  /** "Step {n} of {total}". */
  stepOf: string;
  checklist: string;
  steps: Record<StepKey, string>;
  checks: Record<CheckKey, string>;
  /** Field names a check may list as missing. */
  fields: Record<string, string>;
  required: string;
  fix: string;
  goLive: string;
  submit: string;
  live: string;
  inReview: string;
  missing: string;
  error: string;
}

export const launchPathLabels: LaunchPathLabels = {
  path: 'Path to live',
  stepOf: 'Step {n} of {total}',
  checklist: 'Before going live',
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
  checks: {
    basic_info: 'Basic information complete',
    redirect_uri: 'Redirect URI configured',
    products: 'API products selected',
    policies: 'Privacy policy and terms linked',
    support_email: 'Support email set',
    permissions: 'Permissions approved',
    review: 'Review',
  },
  fields: {
    name: 'name',
    description: 'description',
    homepage_url: 'homepage',
    privacy_url: 'privacy policy',
    terms_url: 'terms',
    logo: 'logo',
    support_email: 'support email',
  },
  required: 'Required',
  fix: 'Fix',
  goLive: 'Go live',
  submit: 'Submit for review',
  live: 'This app is live.',
  inReview: 'The review is under way.',
  missing: 'Still missing:',
  error: 'Something went wrong. Try again.',
};

export interface ChecklistRow {
  key: CheckKey;
  state: Check['state'];
  required: boolean;
  /** Missing fields, or the scopes concerned, as the reader names them. */
  detail: string;
  href: string | null;
}

export interface LaunchPathLogic {
  labels: () => LaunchPathLabels;
  steps: () => Step[];
  /** 1-based position of the step the app is on, or the last when it is live. */
  position: () => number;
  checklist: () => ChecklistRow[];
  /** What going live is called now, or null when there is nothing to ask for. */
  action: () => string | null;
  status: () => string | null;
  canPublish: () => boolean;
  busy: () => boolean;
  error: () => string | null;
  missing: () => string[];
  publish: () => Promise<void>;
}
