/**
 * What an app signs in and calls with: its client ID and secrets, the addresses it may be
 * sent back to, the organization's API keys by environment, and the signing key set. Changes
 * go through the injected `Developer` service; the host refreshes what it invalidates.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Developer } from '@idp/sdk/developer';
import type { ApiKey, App, Environment } from '@idp/sdk/types';
import { freshest } from '../fresh.js';
import { useView } from '../view.js';
import { credentialsLabels, isRedirectUri, type CredentialsLabels, type CredentialsLogic } from './logic.js';
import { CredentialsView } from './view.js';

const ENVIRONMENTS: Environment[] = ['sandbox', 'live'];

const props = {
  app: prop.object<App | null>(null),
  keys: prop.object<ApiKey[]>([]),
  organization: prop.string(''),
  /** The provider's published key set. */
  jwksUrl: prop.string(''),
  /** Whether this member may change the app's credentials. */
  canManage: prop.boolean(false),
  /** A secret handed over by the page that created the app, shown once. */
  secret: prop.string(''),
  /** The reader's language, for dates. */
  locale: prop.string('en'),
  labels: prop.object<Partial<CredentialsLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpCredentials extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const labels = () => ({ ...credentialsLabels, ...this.labels });
    const app = freshest(() => this.app);
    const environment = signal<Environment>('sandbox');
    const copied = signal(false);
    const busy = signal<string | null>(null);
    const error = signal<string | null>(null);
    const fresh = signal<{ value: string; note: string } | null>(this.secret ? { value: this.secret, note: labels().secretOnce } : null);
    // Null while the list is the app's own; a list once the reader starts changing it.
    const redirectEdits = signal<string[] | null>(null);
    const redirectDraft = signal('');
    const keyName = signal('');
    const keyScopes = signal('');

    const clientId = () => app.current()?.client_id ?? '';
    const redirects = () => redirectEdits() ?? app.current()?.redirect_uris ?? [];
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
    const day = new Intl.DateTimeFormat(this.locale, { dateStyle: 'medium', timeZone: 'UTC' });

    const logic: CredentialsLogic = {
      labels,
      environment,
      environments: () =>
        ENVIRONMENTS.map((value) => ({ value, current: environment() === value, choose: () => environment.set(value) })),
      clientId,
      confidential: () => app.current()?.client_type === 'confidential',
      copied,
      copy: () => {
        void navigator.clipboard?.writeText(clientId()).then(() => {
          copied.set(true);
          setTimeout(() => copied.set(false), 1500);
        });
      },
      secrets: () => [...(app.current()?.secrets ?? [])].sort((a, b) => Number(b.active) - Number(a.active)),
      fresh,
      rotate: () =>
        run('rotate', async () => {
          const answer = await developer.rotateSecret(clientId());
          app.adopt(answer.app);
          fresh.set({ value: answer.client_secret, note: labels().secretOnce });
        }),
      revokeSecret: (id) => run(id, async () => app.adopt(await developer.revokeSecret({ client_id: clientId(), secret: id }))),
      redirects,
      redirectDraft,
      editRedirect: (value) => redirectDraft.set(value),
      addRedirect: () => {
        const uri = redirectDraft().trim();
        if (!isRedirectUri(uri)) {
          error.set(labels().invalidUri);
          return;
        }
        error.set(null);
        if (!redirects().includes(uri)) redirectEdits.set([...redirects(), uri]);
        redirectDraft.set('');
      },
      removeRedirect: (uri) => redirectEdits.set(redirects().filter((entry) => entry !== uri)),
      redirectsChanged: () => redirectEdits() !== null,
      saveRedirects: () =>
        run('redirects', async () => {
          app.adopt(await developer.updateApp({ client_id: clientId(), patch: { redirect_uris: redirects() } }));
          redirectEdits.set(null);
        }),
      keys: () => this.keys.filter((key) => key.environment === environment()),
      keyName,
      keyScopes,
      editKey: (field, value) => (field === 'name' ? keyName : keyScopes).set(value),
      createKey: () =>
        run('key', async () => {
          const answer = await developer.createKey({
            organization: this.organization,
            name: keyName().trim(),
            environment: environment(),
            scopes: keyScopes().split(/\s+/).filter(Boolean),
          });
          fresh.set({ value: answer.api_key, note: labels().keyOnce });
          keyName.set('');
          keyScopes.set('');
        }),
      revokeKey: (id) => run(id, async () => void (await developer.revokeKey({ organization: this.organization, key: id }))),
      jwksUrl: () => this.jwksUrl,
      canManage: () => this.canManage,
      date: (iso) => (iso ? day.format(new Date(iso)) : labels().never),
      busy,
      error,
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
