/** A project: its apps, its API keys, who may use its sandbox, its settings. */
import { action, cache, useNavigate, useRouteData, useSubmission } from '@fluixi/start/router';
import type { RouteDataArgs } from '@fluixi/start/router';
import { Button } from '@fluixi-ui/button';
import { Card, CardBody } from '@fluixi-ui/card';
import { Input } from '@fluixi-ui/input';
import { EnvBadge } from '../../components/env-badge.js';
import { ChoiceField, Field, valueOf } from '../../components/field.js';
import { RevealOnce } from '../../components/reveal-once.js';
import { errorText, t } from '../../lib/i18n.js';
import { paramOf } from '../../lib/params.js';
import type { ProjectDetail } from '../../lib/types.js';
import {
  addTestUser,
  createApp,
  createKey,
  loadProject,
  removeTestUser,
  revokeKey,
  updateProject,
} from '../../server/developer.js';
import { settle } from '../../lib/settle.js';

const project = cache((id: string) => loadProject(id), 'project');
export const routeData = (args: RouteDataArgs) => project(paramOf(args, 'id'));

const newApp = action(
  (projectId: string, input: { name: string; client_type: 'public' | 'confidential'; redirect_uri: string }) =>
    createApp(projectId, input),
  'app.create',
  { invalidates: ['project'] },
);
const newKey = action(
  (projectId: string, input: { name: string; environment: 'sandbox' | 'live'; scopes: string[] }) =>
    createKey(projectId, input),
  'key.create',
  { invalidates: ['project'] },
);
const dropKey = action((projectId: string, keyId: string) => revokeKey(projectId, keyId), 'key.revoke', {
  invalidates: ['project'],
});
const newTester = action((projectId: string, email: string) => addTestUser(projectId, email), 'tester.add', {
  invalidates: ['project'],
});
const dropTester = action((projectId: string, email: string) => removeTestUser(projectId, email), 'tester.remove', {
  invalidates: ['project'],
});
const saveProject = action(
  (projectId: string, patch: { name?: string; support_email?: string | null }) => updateProject(projectId, patch),
  'project.update',
  { invalidates: ['project', 'home'] },
);

const words = (text: string) => text.split(/[\s,]+/).filter(Boolean);

export default function ProjectPage() {
  const data = useRouteData<ProjectDetail>();
  const id = () => data()?.project.id ?? '';
  return (
    <section>
      <Link href="/" class="back">
        {() => t('project.back')}
      </Link>
      <h1>{() => data()?.project.name ?? ''}</h1>
      <Apps id={id()} />
      <Keys id={id()} />
      <TestUsers id={id()} />
      <Settings id={id()} />
    </section>
  );
}

function Apps(props: { id: string }) {
  const data = useRouteData<ProjectDetail>();
  const navigate = useNavigate();
  const name = $signal('');
  const kind = $signal<'public' | 'confidential'>('public');
  const redirect = $signal('');
  const submission = useSubmission(newApp);
  const submit = async () => {
    const created = await newApp(props.id, { name: name().trim(), client_type: kind(), redirect_uri: redirect().trim() });
    // A confidential app's secret is shown on the app page, once, from the creation answer.
    navigate(`/apps/${created.app.client_id}`, { state: { secret: created.client_secret } });
  };
  return (
    <Card class="panel">
      <CardBody>
        <h2>{() => t('project.apps')}</h2>
        <Show when={(data()?.apps ?? []).length} fallback={<p class="muted">{() => t('project.appsEmpty')}</p>}>
          <ul class="rows">
            <For each={data()?.apps ?? []}>
              {(app) => (
                <li>
                  <Link href={`/apps/${app.client_id}`} class="row-link">
                    <strong>{app.name}</strong>
                    <code class="mono muted">{app.client_id}</code>
                  </Link>
                  <EnvBadge environment={app.environment} review={app.review_status} />
                </li>
              )}
            </For>
          </ul>
        </Show>
        <h3>{() => t('project.newApp')}</h3>
        <form
          class="form-row"
          onSubmit={(event: SubmitEvent) => {
            event.preventDefault();
            settle(submit());
          }}
        >
          <Field label={t('project.appName')}>
            <Input value={name()} onInput={(e: InputEvent) => name.set(valueOf(e))} required />
          </Field>
          <ChoiceField name="app-type" label={t('project.appType')} hint={t('project.typeHint')}>
              <Button
                type="button"
                variant={kind() === 'public' ? 'solid' : 'outline'}
                onPress={() => kind.set('public')}
              >
                {() => t('project.public')}
              </Button>
              <Button
                type="button"
                variant={kind() === 'confidential' ? 'solid' : 'outline'}
                onPress={() => kind.set('confidential')}
              >
                {() => t('project.confidential')}
              </Button>
          </ChoiceField>
          <Field label={t('project.redirectUri')}>
            <Input
              type="url"
              placeholder="https://"
              value={redirect()}
              onInput={(e: InputEvent) => redirect.set(valueOf(e))}
            />
          </Field>
          <Button type="submit" variant="solid" disabled={submission()?.pending}>
            {() => t('common.create')}
          </Button>
        </form>
        <Show when={submission()?.error}>
          {() => <p class="alert" role="alert">{errorText(submission()?.error)}</p>}
        </Show>
      </CardBody>
    </Card>
  );
}

function Keys(props: { id: string }) {
  const data = useRouteData<ProjectDetail>();
  const name = $signal('');
  const environment = $signal<'sandbox' | 'live'>('sandbox');
  const scopes = $signal('');
  const created = $signal<string | null>(null);
  const submission = useSubmission(newKey);
  const submit = async () => {
    const answer = await newKey(props.id, { name: name().trim(), environment: environment(), scopes: words(scopes()) });
    created.set(answer.api_key);
    name.set('');
    scopes.set('');
  };
  return (
    <Card class="panel">
      <CardBody>
        <h2>{() => t('project.keys')}</h2>
        <Show when={created()}>{() => <RevealOnce value={created() ?? ''} note={t('app.keyOnce')} />}</Show>
        <Show when={(data()?.keys ?? []).length} fallback={<p class="muted">{() => t('project.keysEmpty')}</p>}>
          <ul class="rows">
            <For each={data()?.keys ?? []}>
              {(key) => (
                <li classList={{ inactive: !key.active }}>
                  <span class="row-text">
                    <strong>{key.name}</strong>
                    <code class="mono muted">{`${key.prefix}…`}</code>
                    <span class="muted">{key.scopes.join(' ')}</span>
                  </span>
                  <EnvBadge environment={key.environment} />
                  <Show when={key.active}>
                    <Button variant="ghost" onPress={() => settle(dropKey(props.id, key.id))}>
                      {() => t('common.revoke')}
                    </Button>
                  </Show>
                </li>
              )}
            </For>
          </ul>
        </Show>
        <form
          class="form-row"
          onSubmit={(event: SubmitEvent) => {
            event.preventDefault();
            settle(submit());
          }}
        >
          <Field label={t('project.keyName')}>
            <Input value={name()} onInput={(e: InputEvent) => name.set(valueOf(e))} required />
          </Field>
          <ChoiceField name="key-env" label={t('project.keyEnv')}>
              <Button
                type="button"
                variant={environment() === 'sandbox' ? 'solid' : 'outline'}
                onPress={() => environment.set('sandbox')}
              >
                {() => t('env.sandbox')}
              </Button>
              <Button
                type="button"
                variant={environment() === 'live' ? 'solid' : 'outline'}
                onPress={() => environment.set('live')}
              >
                {() => t('env.live')}
              </Button>
          </ChoiceField>
          <Field label={t('project.keyScopes')}>
            <Input value={scopes()} onInput={(e: InputEvent) => scopes.set(valueOf(e))} />
          </Field>
          <Button type="submit" variant="solid" disabled={submission()?.pending}>
            {() => t('common.create')}
          </Button>
        </form>
        <Show when={submission()?.error}>
          {() => <p class="alert" role="alert">{errorText(submission()?.error)}</p>}
        </Show>
      </CardBody>
    </Card>
  );
}

function TestUsers(props: { id: string }) {
  const data = useRouteData<ProjectDetail>();
  const email = $signal('');
  const submission = useSubmission(newTester);
  const submit = async () => {
    await newTester(props.id, email().trim());
    email.set('');
  };
  return (
    <Card class="panel">
      <CardBody>
        <h2>{() => t('project.testUsers')}</h2>
        <p class="muted">{() => t('project.testUsersText')}</p>
        <ul class="rows">
          <For each={data()?.test_users ?? []}>
            {(user) => (
              <li>
                <span class="row-text">{user.email}</span>
                <Button variant="ghost" onPress={() => settle(dropTester(props.id, user.email))}>
                  {() => t('common.remove')}
                </Button>
              </li>
            )}
          </For>
        </ul>
        <form
          class="form-row"
          onSubmit={(event: SubmitEvent) => {
            event.preventDefault();
            settle(submit());
          }}
        >
          <Field label={t('project.testUserEmail')}>
            <Input type="email" value={email()} onInput={(e: InputEvent) => email.set(valueOf(e))} required />
          </Field>
          <Button type="submit" variant="outline" disabled={submission()?.pending}>
            {() => t('common.add')}
          </Button>
        </form>
        <Show when={submission()?.error}>
          {() => <p class="alert" role="alert">{errorText(submission()?.error)}</p>}
        </Show>
      </CardBody>
    </Card>
  );
}

function Settings(props: { id: string }) {
  const data = useRouteData<ProjectDetail>();
  const name = $signal(data()?.project.name ?? '');
  const supportEmail = $signal(data()?.project.support_email ?? '');
  const submission = useSubmission(saveProject);
  return (
    <Card class="panel">
      <CardBody>
        <h2>{() => t('project.settings')}</h2>
        <form
          class="form-row"
          onSubmit={(event: SubmitEvent) => {
            event.preventDefault();
            settle(saveProject(props.id, { name: name().trim(), support_email: supportEmail().trim() || null }));
          }}
        >
          <Field label={t('projects.name')}>
            <Input value={name()} onInput={(e: InputEvent) => name.set(valueOf(e))} required />
          </Field>
          <Field label={t('projects.supportEmail')}>
            <Input type="email" value={supportEmail()} onInput={(e: InputEvent) => supportEmail.set(valueOf(e))} />
          </Field>
          <Button type="submit" variant="outline" disabled={submission()?.pending}>
            {() => t('common.save')}
          </Button>
        </form>
        <Show when={submission()?.error}>
          {() => <p class="alert" role="alert">{errorText(submission()?.error)}</p>}
        </Show>
      </CardBody>
    </Card>
  );
}
