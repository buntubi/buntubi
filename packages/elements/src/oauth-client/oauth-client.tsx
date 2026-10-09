/**
 * An app's OAuth client: the ID to copy, the secrets (rotate, revoke) and the redirect addresses.
 * Changes go through the injected `Developer` service.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Developer } from '@idp/sdk/developer';
import type { App } from '@idp/sdk/types';
import { copier } from '../copy.js';
import { freshest } from '../fresh.js';
import '../one-time-value/one-time-value.js';
import '../secret-row/secret-row.js';
import { useView } from '../view.js';
import { oauthClientLabels, type OAuthClientLabels, type OAuthClientLogic } from './logic.js';
import { OAuthClientView } from './view.js';

const props = {
  app: prop.object<App | null>(null),
  /** A secret handed over by the page that created the app, shown once. */
  secret: prop.string(''),
  /** Where the redirect addresses are changed. */
  redirectsHref: prop.string(''),
  canManage: prop.boolean(false),
  /** The reader's language, for dates. */
  locale: prop.string('en'),
  labels: prop.object<Partial<OAuthClientLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpOAuthClient extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const labels = () => ({ ...oauthClientLabels, ...this.labels });
    const app = freshest(() => this.app);
    const clip = copier();
    const fresh = signal(this.secret);
    const busy = signal<string | null>(null);
    const error = signal<string | null>(null);
    const day = new Intl.DateTimeFormat(this.locale, { dateStyle: 'medium', timeZone: 'UTC' });
    const clientId = () => app.current()?.client_id ?? '';
    const run = async (key: string, work: () => Promise<void>) => {
      busy.set(key);
      error.set(null);
      try {
        await work();
      } catch (failure) {
        error.set(this.describe?.(failure) ?? labels().error);
      } finally {
        busy.set(null);
      }
    };
    const logic: OAuthClientLogic = {
      labels,
      clientId,
      confidential: () => app.current()?.client_type === 'confidential',
      copyLabel: () => (clip.copied() ? labels().copied : labels().copy),
      copy: () => clip.copy(clientId()),
      secrets: () => [...(app.current()?.secrets ?? [])].filter((secret) => secret.active),
      date: (iso) => (iso ? day.format(new Date(iso)) : labels().never),
      fresh,
      redirects: () => app.current()?.redirect_uris ?? [],
      redirectsHref: () => this.redirectsHref,
      canManage: () => this.canManage,
      rotate: () =>
        run('rotate', async () => {
          const answer = await developer.rotateSecret(clientId());
          app.adopt(answer.app);
          fresh.set(answer.client_secret);
        }),
      revoke: (id) => run(id, async () => app.adopt(await developer.revokeSecret({ client_id: clientId(), secret: id }))),
      busy,
      error,
    };
    return useView(OAuthClientView)(logic);
  }
}

defineCustomElement('idp-oauth-client', IdpOAuthClient);

declare global {
  interface HTMLElementTagNameMap {
    'idp-oauth-client': IdpOAuthClient;
  }
  interface JSXCustomElements {
    'idp-oauth-client': ElementAttributes<typeof props>;
  }
}
