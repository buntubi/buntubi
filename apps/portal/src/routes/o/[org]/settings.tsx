/** The organization's settings, and its deletion for an owner. */
import { Stack } from '@fluixi-ui/layout';
import { useNavigate, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import { can } from '@idp/sdk/roles';
import '@idp/elements/organization-settings';
import { errorText, t } from '../../../lib/i18n.js';
import { organizationSettingsLabels, formMessages } from '../../../lib/labels.js';
import { paramOf } from '../../../lib/params.js';
import type { Workspace } from '../../../lib/types.js';
import { workspace } from '../../../data/developer.js';
import '@idp/elements/page-header';
import { paths } from '../../../lib/paths.js';

export const routeData = (args: RouteDataArgs) => workspace(paramOf(args, 'org'));

export default function SettingsPage() {
  const data = useRouteData<Workspace>();
  const navigate = useNavigate();
  const organization = () => data()?.current?.organization ?? null;
  return (
    <Stack gap={5}>
      <idp-page-header title={t('page.settings')} />
      <idp-organization-settings
        organization={organization()}
        canEdit={can(organization()?.role, 'settings')}
        canDelete={can(organization()?.role, 'delete')}
        labels={organizationSettingsLabels()}
        messages={formMessages()}
        describe={errorText}
        onDeleted={() => navigate(paths.start())}
      />
    </Stack>
  );
}
