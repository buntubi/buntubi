/** An app's credentials page, apart from how it looks: which environment, and the blocks' words. */
import type { Environment } from '@idp/sdk/types';
import type { ApiKeysLabels } from '../api-keys/logic.js';
import type { OAuthClientLabels } from '../oauth-client/logic.js';
import type { SigningKeysLabels } from '../signing-keys/logic.js';

export interface CredentialsLabels {
  title: string;
  /** What the environment's credentials reach, one line each. */
  intro: Record<Environment, string>;
  environments: Record<Environment, string>;
  environment: string;
  client: Partial<OAuthClientLabels>;
  keys: Partial<ApiKeysLabels>;
  signing: Partial<SigningKeysLabels>;
}

export const credentialsLabels: CredentialsLabels = {
  title: 'Credentials',
  intro: {
    sandbox: 'Sandbox: you, your team and test users, every selected scope.',
    live: 'Production: everyone, the scopes approved for live.',
  },
  environments: { sandbox: 'Sandbox', live: 'Production' },
  environment: 'Environment',
  client: {},
  keys: {},
  signing: {},
};

export interface CredentialsLogic {
  labels: () => CredentialsLabels;
  environment: () => Environment;
  environments: () => { value: string; label: string; dot: string }[];
  choose: (environment: string) => void;
}
