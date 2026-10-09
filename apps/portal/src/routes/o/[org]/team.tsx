/** The organization's members and its sandbox test users. */
import { useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import { can } from '@idp/sdk/roles';
import '@idp/elements/team';
import { errorText, locale, t } from '../../../lib/i18n.js';
import { teamLabels } from '../../../lib/labels.js';
import { paramOf } from '../../../lib/params.js';
import type { Workspace } from '../../../lib/types.js';
import { workspace } from './layout.js';

export const routeData = (args: RouteDataArgs) => workspace(paramOf(args, 'org'));

export default function TeamPage() {
  const data = useRouteData<Workspace>();
  const current = () => data()?.current;
  const role = () => current()?.organization.role;
  return (
    <div class="stack">
      <header class="page-head">
        <h1>{() => t('page.team')}</h1>
      </header>
      <idp-team
        organization={current()?.organization.id ?? ''}
        members={current()?.members ?? []}
        testUsers={current()?.test_users ?? []}
        apps={(current()?.apps ?? []).map((app) => ({ client_id: app.client_id, name: app.name }))}
        me={data()?.me.email ?? ''}
        canManage={can(role(), 'members')}
        canManageTesters={can(role(), 'test_users')}
        locale={locale()}
        labels={teamLabels()}
        describe={errorText}
      />
    </div>
  );
}
