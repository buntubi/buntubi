/** Every developer project: who owns it, what it was approved for, suspension. */
import { action, cache, useNavigate, useRouteData, useSubmission } from '@fluixi/start/router';
import type { RouteDataArgs } from '@fluixi/start/router';
import { Badge } from '@fluixi-ui/badge';
import { Button } from '@fluixi-ui/button';
import { Card, CardBody } from '@fluixi-ui/card';
import { Input } from '@fluixi-ui/input';
import { Field, valueOf } from '../components/field.js';
import { errorText, t } from '../lib/i18n.js';
import { searchOf } from '../lib/params.js';
import type { ProjectRow } from '../lib/types.js';
import { loadProjects, restoreProject, suspendProject } from '../server/admin.js';
import { settle } from '../lib/settle.js';

const projects = cache((q: string) => loadProjects(q), 'projects');
export const routeData = (args: RouteDataArgs) => projects(searchOf(args, 'q'));

const suspend = action((input: { id: string; reason: string }) => suspendProject(input), 'project.suspend', {
  invalidates: ['projects', 'overview'],
});
const restore = action((id: string) => restoreProject(id), 'project.restore', {
  invalidates: ['projects', 'overview'],
});

export default function ProjectsPage() {
  const data = useRouteData<ProjectRow[]>();
  const navigate = useNavigate();
  const q = $signal('');
  return (
    <section>
      <h1>{() => t('projects.title')}</h1>
      <form
        class="form-row search"
        onSubmit={(event: SubmitEvent) => {
          event.preventDefault();
          navigate(`/projects?q=${encodeURIComponent(q().trim())}`);
        }}
      >
        <Input type="search" value={q()} onInput={(e: InputEvent) => q.set(valueOf(e))} aria-label={t('common.search')} />
        <Button type="submit" variant="outline">
          {() => t('common.search')}
        </Button>
      </form>
      <Show when={(data() ?? []).length} fallback={<p class="muted">{() => t('common.none')}</p>}>
        <For each={data() ?? []}>{(project) => <ProjectCard project={project} />}</For>
      </Show>
    </section>
  );
}

function ProjectCard(props: { project: ProjectRow }) {
  const project = props.project;
  const reason = $signal('');
  const submission = useSubmission(suspend);
  return (
    <Card class="panel">
      <CardBody>
        <div class="title-row">
          <h2>{project.name}</h2>
          <Show when={project.suspended}>
            <Badge variant="soft" tone="danger">
              {() => t('projects.suspended')}
            </Badge>
          </Show>
        </div>
        <p class="muted">
          {`${t('projects.owner')} ${project.owner.email ?? ''} · ${project.apps} ${t('projects.apps')}`}
        </p>
        <Show when={project.approved_scopes.length}>
          <p class="muted">{`${t('projects.approved')} : ${project.approved_scopes.join(' ')}`}</p>
        </Show>
        <Show
          when={project.suspended}
          fallback={
            <div class="form-row">
              <Field label={t('projects.reason')}>
                <Input value={reason()} onInput={(e: InputEvent) => reason.set(valueOf(e))} />
              </Field>
              <Button
                variant="outline"
                disabled={!reason().trim() || submission()?.pending}
                onPress={() => settle(suspend({ id: project.id, reason: reason().trim() }))}
              >
                {() => t('projects.suspend')}
              </Button>
            </div>
          }
        >
          <p class="muted">{project.suspended_reason ?? ''}</p>
          <Button variant="outline" onPress={() => settle(restore(project.id))}>
            {() => t('projects.restore')}
          </Button>
        </Show>
        <Show when={submission()?.error}>
          {() => <p class="alert" role="alert">{errorText(submission()?.error)}</p>}
        </Show>
      </CardBody>
    </Card>
  );
}
