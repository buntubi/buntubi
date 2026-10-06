/** Home: an invitation to sign in, the developer terms, or the developer's projects. */
import { action, cache, useNavigate, useRouteData, useSubmission } from '@fluixi/start/router';
import { Button } from '@fluixi-ui/button';
import { Card, CardBody } from '@fluixi-ui/card';
import { Input } from '@fluixi-ui/input';
import { Field, valueOf } from '../components/field.js';
import { errorText, t } from '../lib/i18n.js';
import type { Home } from '../lib/types.js';
import { acceptTerms, createProject, loadHome } from '../server/developer.js';
import { auth } from '../services/auth.js';
import { settle } from '../lib/settle.js';

const home = cache(() => loadHome(), 'home');
export const routeData = () => home();

const accept = action(() => acceptTerms(), 'developer.terms', { invalidates: ['home'] });
const create = action(
  (input: { name: string; support_email: string }) => createProject(input),
  'project.create',
  { invalidates: ['home'] },
);

export default function HomePage() {
  const data = useRouteData<Home>();
  const me = () => data()?.me ?? null;
  return (
    <Switch fallback={<Projects />}>
      <Match when={!me()}>
        <section class="hero">
          <h1>{() => t('landing.title')}</h1>
          <p class="lead">{() => t('landing.text')}</p>
          <Button variant="solid" class="wide" onPress={() => auth.signIn({ returnTo: '/' })}>
            {() => t('landing.signIn')}
          </Button>
        </section>
      </Match>
      <Match when={me() && !me()?.developer}>
        <Terms />
      </Match>
    </Switch>
  );
}

function Terms() {
  const submission = useSubmission(accept);
  return (
    <section class="narrow">
      <h1>{() => t('terms.title')}</h1>
      <p class="lead">{() => t('terms.text')}</p>
      <Show when={submission()?.error}>
        {() => <p class="alert" role="alert">{errorText(submission()?.error)}</p>}
      </Show>
      <Button variant="solid" disabled={submission()?.pending} onPress={() => settle(accept())}>
        {() => t('terms.accept')}
      </Button>
    </section>
  );
}

function Projects() {
  const data = useRouteData<Home>();
  const navigate = useNavigate();
  const name = $signal('');
  const supportEmail = $signal('');
  const submission = useSubmission(create);
  const submit = async () => {
    if (!name().trim()) return;
    const project = await create({ name: name().trim(), support_email: supportEmail().trim() });
    navigate(`/projects/${project.id}`);
  };
  return (
    <section>
      <h1>{() => t('projects.title')}</h1>
      <Show when={(data()?.projects ?? []).length} fallback={<p class="muted">{() => t('projects.empty')}</p>}>
        <div class="grid">
          <For each={data()?.projects ?? []}>
            {(project) => (
              <Link href={`/projects/${project.id}`} class="tile">
                <strong>{project.name}</strong>
                <span class="muted">{project.support_email ?? ''}</span>
              </Link>
            )}
          </For>
        </div>
      </Show>
      <Card class="panel">
        <CardBody>
          <h2>{() => t('projects.new')}</h2>
          <form
            class="form-row"
            onSubmit={(event: SubmitEvent) => {
              event.preventDefault();
              settle(submit());
            }}
          >
            <Field label={t('projects.name')}>
              <Input value={name()} onInput={(e: InputEvent) => name.set(valueOf(e))} required />
            </Field>
            <Field label={t('projects.supportEmail')}>
              <Input type="email" value={supportEmail()} onInput={(e: InputEvent) => supportEmail.set(valueOf(e))} />
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
    </section>
  );
}
