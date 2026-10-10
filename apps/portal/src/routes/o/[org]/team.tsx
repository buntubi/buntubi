/** The organization's members and its sandbox test users. */
import { useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import { can } from '@idp/sdk/roles';
import '@idp/elements/team';
import { errorText, locale, t } from '../../../lib/i18n.js';
import { teamLabels, formMessages } from '../../../lib/labels.js';
import { paramOf } from '../../../lib/params.js';
import type { Workspace } from '../../../lib/types.js';
import { workspace } from '../../../data/developer.js';

export const routeData = (args: RouteDataArgs) => workspace(paramOf(args, 'org'));

export default function TeamPage() {
  const data = useRouteData<Workspace>();
  const current = () => data()?.current;
  const role = () => current()?.organization.role;
  return (
    <idp-team
      organization={current()?.organization.id ?? ''}
      name={current()?.organization.name ?? ''}
      members={current()?.members ?? []}
      testUsers={current()?.test_users ?? []}
      apps={(current()?.apps ?? []).map((app) => ({ client_id: app.client_id, name: app.name }))}
      me={data()?.me.email ?? ''}
      canManage={can(role(), 'members')}
      canManageTesters={can(role(), 'test_users')}
      messages={formMessages()}
      locale={locale()}
      labels={teamLabels()}
      describe={errorText}
    />
  );
}
