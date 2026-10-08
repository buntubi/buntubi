/** Every developer organization: who owns it, what it was approved for, suspension. */
import { action, cache, useNavigate, useRouteData, useSubmission } from '@fluixi/start/router';
import type { RouteDataArgs } from '@fluixi/start/router';
import { Badge } from '@fluixi-ui/badge';
import { Button } from '@fluixi-ui/button';
import { Card, CardBody } from '@fluixi-ui/card';
import { Input } from '@fluixi-ui/input';
import { Field, valueOf } from '../components/field.js';
import { errorText, t } from '../lib/i18n.js';
import { searchOf } from '../lib/params.js';
import type { OrganizationRow } from '../lib/types.js';
import { loadOrganizations, restoreOrganization, suspendOrganization } from '../server/admin.js';
import { settle } from '../lib/settle.js';

const organizations = cache((q: string) => loadOrganizations(q), 'organizations');
export const routeData = (args: RouteDataArgs) => organizations(searchOf(args, 'q'));

const suspend = action((input: { id: string; reason: string }) => suspendOrganization(input), 'organization.suspend', {
  invalidates: ['organizations', 'overview'],
});
const restore = action((id: string) => restoreOrganization(id), 'organization.restore', {
  invalidates: ['organizations', 'overview'],
});

export default function OrganizationsPage() {
  const data = useRouteData<OrganizationRow[]>();
  const navigate = useNavigate();
  const q = $signal('');
  return (
    <section class="legacy">
      <h1>{() => t('organizations.title')}</h1>
      <form
        class="form-row search"
        onSubmit={(event: SubmitEvent) => {
          event.preventDefault();
          navigate(`/organizations?q=${encodeURIComponent(q().trim())}`);
        }}
      >
        <Input type="search" value={q()} onInput={(e: InputEvent) => q.set(valueOf(e))} aria-label={t('common.search')} />
        <Button type="submit" variant="outline">
          {() => t('common.search')}
        </Button>
      </form>
      <Show when={(data() ?? []).length} fallback={<p class="muted">{() => t('common.none')}</p>}>
        <For each={data() ?? []}>{(organization) => <OrganizationCard organization={organization} />}</For>
      </Show>
    </section>
  );
}

function OrganizationCard(props: { organization: OrganizationRow }) {
  const organization = props.organization;
  const reason = $signal('');
  const submission = useSubmission(suspend);
  return (
    <Card class="panel">
      <CardBody>
        <div class="title-row">
          <h2>{organization.name}</h2>
          <Show when={organization.suspended}>
            <Badge variant="soft" tone="danger">
              {() => t('organizations.suspended')}
            </Badge>
          </Show>
        </div>
        <p class="muted">
          {`${t('organizations.owner')} ${organization.owner?.email ?? ''} · ${organization.members} ${t('organizations.members')} · ${organization.apps} ${t('organizations.apps')}`}
        </p>
        <Show when={organization.approved_scopes.length}>
          <p class="muted">{`${t('organizations.approved')} : ${organization.approved_scopes.join(' ')}`}</p>
        </Show>
        <Show
          when={organization.suspended}
          fallback={
            <div class="form-row">
              <Field label={t('organizations.reason')}>
                <Input value={reason()} onInput={(e: InputEvent) => reason.set(valueOf(e))} />
              </Field>
              <Button
                variant="outline"
                disabled={!reason().trim() || submission()?.pending}
                onPress={() => settle(suspend({ id: organization.id, reason: reason().trim() }))}
              >
                {() => t('organizations.suspend')}
              </Button>
            </div>
          }
        >
          <p class="muted">{organization.suspended_reason ?? ''}</p>
          <Button variant="outline" onPress={() => settle(restore(organization.id))}>
            {() => t('organizations.restore')}
          </Button>
        </Show>
        <Show when={submission()?.error}>
          {() => <p class="alert" role="alert">{errorText(submission()?.error)}</p>}
        </Show>
      </CardBody>
    </Card>
  );
}
