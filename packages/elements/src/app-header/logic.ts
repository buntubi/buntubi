/** An app's name, where it stands, and the step it can take next; apart from the look. */
import type { AppKind, Environment, Stage } from '@buntu/sdk/types';

export interface AppHeaderLabels {
  firstParty: string;
  firstPartyHelp: string;
  appId: string;
  kinds: Record<AppKind, string>;
  environments: Record<Environment, string>;
  stages: Record<Stage, string>;
  goLive: string;
  submit: string;
  resubmit: string;
  missing: string;
  error: string;
}

export const appHeaderLabels: AppHeaderLabels = {
  firstParty: 'Skips consent',
  firstPartyHelp: 'Set in the owner console: people sign in without a consent screen.',
  appId: 'App ID',
  kinds: {
    consumer: 'Consumer app',
    business: 'Business app',
    web: 'Web application',
    mobile: 'Mobile app',
    backend: 'Backend service',
    internal: 'Internal tool',
  },
  environments: { sandbox: 'Sandbox', live: 'Production' },
  stages: { draft: 'Draft', in_review: 'In review', changes_requested: 'Changes requested', live: 'Live' },
  goLive: 'Go live',
  submit: 'Submit for review',
  resubmit: 'Resubmit for review',
  missing: 'Still missing:',
  error: 'Something went wrong. Try again.',
};

export interface AppHeaderLogic {
  labels: () => AppHeaderLabels;
  name: () => string;
  mark: () => string;
  logo: () => string;
  clientId: () => string;
  kind: () => string;
  environment: () => string;
  stage: () => Stage;
  stageLabel: () => string;
  firstParty: () => boolean;
  /** The next step's words, and where it leads: a page, or going live at once. */
  action: () => { label: string; href: string } | null;
  publish: () => Promise<void>;
  busy: () => boolean;
  error: () => string | null;
  missing: () => string[];
}
