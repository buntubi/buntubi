/**
 * An app's credentials page: the environment, the OAuth client, the organization's API keys for
 * that environment, and the signing keys. Each part is its own element; this one keeps which
 * environment is shown and lays them out.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import type { ApiKey, App, Environment } from '@idp/sdk/types';
import '../api-keys/api-keys.js';
import '../oauth-client/oauth-client.js';
import '../page-header/page-header.js';
import '../segmented/segmented.js';
import '../signing-keys/signing-keys.js';
import { useView } from '../view.js';
import { credentialsLabels, type CredentialsLabels, type CredentialsLogic } from './logic.js';
import { CredentialsView, type CredentialsHost } from './view.js';

const DOT: Record<Environment, string> = { sandbox: 'var(--idp-warn)', live: 'var(--idp-ok)' };

const props = {
  app: prop.object<App | null>(null),
  keys: prop.object<ApiKey[]>([]),
  organization: prop.string(''),
  /** The provider's published key set. */
  jwksUrl: prop.string(''),
  /** Where the redirect addresses are changed. */
  redirectsHref: prop.string(''),
  canManage: prop.boolean(false),
  /** A secret handed over by the page that created the app, shown once. */
  secret: prop.string(''),
  locale: prop.string('en'),
  labels: prop.object<Partial<CredentialsLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
  /** Text for validation keys, handed to the API keys; see messages.ts. */
  messages: prop.object<Record<string, string>>({}),
};

export class IdpCredentials extends typedElement(props) {
  protected override render(): unknown {
    const labels = () => ({ ...credentialsLabels, ...this.labels });
    const environment = signal<Environment>('sandbox');
    const logic: CredentialsLogic & CredentialsHost = {
      labels,
      environment,
      environments: () => (['sandbox', 'live'] as Environment[]).map((value) => ({ value, label: labels().environments[value], dot: DOT[value] })),
      choose: (value) => environment.set(value as Environment),
      app: () => this.app,
      keys: () => this.keys,
      organization: () => this.organization,
      jwksUrl: () => this.jwksUrl,
      redirectsHref: () => this.redirectsHref,
      canManage: () => this.canManage,
      secret: () => this.secret,
      locale: () => this.locale,
      describe: () => this.describe,
      messages: () => this.messages,
    };
    return useView(CredentialsView)(logic);
  }
}

defineCustomElement('idp-credentials', IdpCredentials);

declare global {
  interface HTMLElementTagNameMap {
    'idp-credentials': IdpCredentials;
  }
  interface JSXCustomElements {
    'idp-credentials': ElementAttributes<typeof props>;
  }
}
