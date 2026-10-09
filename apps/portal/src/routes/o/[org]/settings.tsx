/** The organization's settings, and its deletion for an owner. */
import { useNavigate, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import { can } from '@idp/sdk/roles';
import '@idp/elements/organization-settings';
import { errorText, t } from '../../../lib/i18n.js';
import { organizationSettingsLabels } from '../../../lib/labels.js';
import { paramOf } from '../../../lib/params.js';
import type { Workspace } from '../../../lib/types.js';
import { workspace } from './layout.js';

export const routeData = (args: RouteDataArgs) => workspace(paramOf(args, 'org'));

export default function SettingsPage() {
  const data = useRouteData<Workspace>();
  const navigate = useNavigate();
  const organization = () => data()?.current?.organization ?? null;
  return (
    <div class="stack">
      <header class="page-head">
        <h1>{() => t('page.settings')}</h1>
      </header>
      <idp-organization-settings
        organization={organization()}
        canEdit={can(organization()?.role, 'settings')}
        canDelete={can(organization()?.role, 'delete')}
        labels={organizationSettingsLabels()}
        describe={errorText}
        onDeleted={() => navigate('/')}
      />
    </div>
  );
}
