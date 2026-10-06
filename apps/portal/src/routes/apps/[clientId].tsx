/** An app: its credentials, its details, and the way to live. */
import { action, cache, useLocation, useRouteData, useSubmission } from '@fluixi/start/router';
import type { RouteDataArgs } from '@fluixi/start/router';
import { Button } from '@fluixi-ui/button';
import { Card, CardBody } from '@fluixi-ui/card';
import { Input } from '@fluixi-ui/input';
import { EnvBadge } from '../../components/env-badge.js';
import { Field, valueOf } from '../../components/field.js';
import { RevealOnce } from '../../components/reveal-once.js';
import { errorText, t } from '../../lib/i18n.js';
import { paramOf } from '../../lib/params.js';
import type { App } from '../../lib/types.js';
import { loadApp, publishApp, revokeSecret, rotateSecret, updateApp } from '../../server/developer.js';

const app = cache((clientId: string) => loadApp(clientId), 'app');
export const routeData = (args: RouteDataArgs) => app(paramOf(args, 'clientId'));

const rotate = action((clientId: string) => rotateSecret(clientId), 'secret.rotate', { invalidates: ['app'] });
const revoke = action((clientId: string, secretId: string) => revokeSecret(clientId, secretId), 'secret.revoke', {
  invalidates: ['app'],
});
const save = action((clientId: string, patch: Record<string, unknown>) => updateApp(clientId, patch), 'app.update', {
  invalidates: ['app', 'project'],
});
const publish = action((clientId: string) => publishApp(clientId), 'app.publish', { invalidates: ['app', 'project'] });

const words = (text: string) => text.split(/\s+/).filter(Boolean);
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : t('common.never'));

export default function AppPage() {
  const data = useRouteData<App>();
  return (
    <section>
      <Link href={`/projects/${data()?.project_id ?? ''}`} class="back">
        {() => t('app.back')}
      </Link>
      <div class="title-row">
        <h1>{() => data()?.name ?? ''}</h1>
        <Show when={data()}>
          {() => <EnvBadge environment={data()!.environment} review={data()!.review_status} />}
        </Show>
      </div>
      <Credentials />
      <Details />
      <Publishing />
    </section>
  );
}

function Credentials() {
  const data = useRouteData<App>();
  const location = useLocation();
  // The secret from the creation answer, handed over by the project page for this one view.
  const fresh = $signal<string | null>((location.state as { secret?: string | null } | undefined)?.secret ?? null);
  const rotating = useSubmission(rotate);
  const newSecret = async () => {
    const answer = await rotate(data()!.client_id);
    fresh.set(answer.client_secret);
  };
  return (
    <Card class="panel">
      <CardBody>
        <h2>{() => t('app.credentials')}</h2>
        <Field label={t('app.clientId')}>
          <code class="mono">{() => data()?.client_id ?? ''}</code>
        </Field>
        <Show when={data()?.client_type === 'confidential'}>
          <h3>{() => t('app.secrets')}</h3>
          <Show when={fresh()}>{() => <RevealOnce value={fresh() ?? ''} note={t('app.secretOnce')} />}</Show>
          <ul class="rows">
            <For each={data()?.secrets ?? []}>
              {(secret) => (
                <li classList={{ inactive: !secret.active }}>
                  <span class="row-text">
                    <code class="mono">{`${secret.prefix}…`}</code>
                    <span class="muted">{`${t('app.lastUsed')} ${day(secret.last_used_at)}`}</span>
                    <Show when={secret.expires_at}>
                      <span class="muted">{`${t('app.expires')} ${day(secret.expires_at)}`}</span>
                    </Show>
                  </span>
                  <Show when={secret.active}>
                    <Button variant="ghost" onPress={() => revoke(data()!.client_id, secret.id)}>
                      {() => t('common.revoke')}
                    </Button>
                  </Show>
                </li>
              )}
            </For>
          </ul>
          <Button variant="outline" disabled={rotating()?.pending} onPress={() => void newSecret()}>
            {() => t('app.newSecret')}
          </Button>
          <Show when={rotating()?.error}>
            {() => <p class="alert" role="alert">{errorText(rotating()?.error)}</p>}
          </Show>
        </Show>
      </CardBody>
    </Card>
  );
}

function Details() {
  const data = useRouteData<App>();
  const current = data();
  const redirects = $signal((current?.redirect_uris ?? []).join(' '));
  const scopes = $signal((current?.scopes ?? []).filter((s) => s !== 'openid').join(' '));
  const homepage = $signal(current?.homepage_url ?? '');
  const privacy = $signal(current?.privacy_url ?? '');
  const terms = $signal(current?.terms_url ?? '');
  const logo = $signal(current?.brand.logo ?? '');
  const submission = useSubmission(save);
  const url = (value: string) => value.trim() || null;
  const submit = () =>
    save(data()!.client_id, {
      redirect_uris: words(redirects()),
      scopes: words(scopes()),
      homepage_url: url(homepage()),
      privacy_url: url(privacy()),
      terms_url: url(terms()),
      brand: { ...(data()?.brand ?? {}), logo: url(logo()) ?? undefined },
    });
  return (
    <Card class="panel">
      <CardBody>
        <h2>{() => t('app.details')}</h2>
        <form
          class="form-stack"
          onSubmit={(event: SubmitEvent) => {
            event.preventDefault();
            void submit();
          }}
        >
          <Field label={t('app.redirectUris')}>
            <Input value={redirects()} onInput={(e: InputEvent) => redirects.set(valueOf(e))} />
          </Field>
          <Field label={t('app.scopes')}>
            <Input value={scopes()} onInput={(e: InputEvent) => scopes.set(valueOf(e))} />
          </Field>
          <Field label={t('app.homepage')}>
            <Input type="url" value={homepage()} onInput={(e: InputEvent) => homepage.set(valueOf(e))} />
          </Field>
          <Field label={t('app.privacy')}>
            <Input type="url" value={privacy()} onInput={(e: InputEvent) => privacy.set(valueOf(e))} />
          </Field>
          <Field label={t('app.terms')}>
            <Input type="url" value={terms()} onInput={(e: InputEvent) => terms.set(valueOf(e))} />
          </Field>
          <Field label={t('app.logo')}>
            <Input type="url" value={logo()} onInput={(e: InputEvent) => logo.set(valueOf(e))} />
          </Field>
          <div>
            <Button type="submit" variant="solid" disabled={submission()?.pending}>
              {() => t('common.save')}
            </Button>
          </div>
        </form>
        <Show when={submission()?.error}>
          {() => <p class="alert" role="alert">{errorText(submission()?.error)}</p>}
        </Show>
      </CardBody>
    </Card>
  );
}

function Publishing() {
  const data = useRouteData<App>();
  const submission = useSubmission(publish);
  // What the provider said is still missing, from the last attempt.
  const missing = () => (submission()?.result as { missing?: string[] } | undefined)?.missing ?? [];
  const state = () =>
    data()?.environment === 'live' ? 'live' : data()?.review_status === 'pending' ? 'pending' : 'sandbox';
  return (
    <Card class="panel">
      <CardBody>
        <h2>{() => t('app.publish')}</h2>
        <p>
          {() =>
            state() === 'live'
              ? t('app.publishLive')
              : state() === 'pending'
                ? t('app.publishPending')
                : t('app.publishSandbox')
          }
        </p>
        <Show when={data()?.review_note}>{() => <p class="muted">{data()?.review_note}</p>}</Show>
        <Show when={state() === 'sandbox'}>
          <Button variant="solid" disabled={submission()?.pending} onPress={() => publish(data()!.client_id)}>
            {() => t('app.publishButton')}
          </Button>
        </Show>
        <Show when={missing().length}>
          {() => (
            <p class="alert" role="alert">
              {t('app.missing')} {missing().map((field) => t(`field.${field}` as 'field.logo')).join(', ')}
            </p>
          )}
        </Show>
        <Show when={submission()?.error}>
          {() => <p class="alert" role="alert">{errorText(submission()?.error)}</p>}
        </Show>
      </CardBody>
    </Card>
  );
}
