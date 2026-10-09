/** Every developer organization: who owns it, what it was approved for, suspension. */
import { Stack } from '@fluixi-ui/layout';
import { useLocation, useNavigate, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import '@idp/elements/organization-list';
import '@idp/elements/search-box';
import { errorText, t } from '../lib/i18n.js';
import { organizationCardLabels } from '../lib/labels.js';
import { searchOf } from '../lib/params.js';
import type { OrganizationRow } from '../lib/types.js';
import { paths } from '../lib/paths.js';
import '@idp/elements/page-header';
import { organizations } from '../data/admin.js';

export const routeData = (args: RouteDataArgs) => organizations(searchOf(args, 'q'));

export default function OrganizationsPage() {
  const data = useRouteData<OrganizationRow[]>();
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <Stack gap={5}>
      <idp-page-header title={t('organizations.title')} />
      <idp-search-box
        query={location.query.q ?? ''}
        label={t('common.search')}
        button={t('common.search')}
        onSearch={(event) => navigate(paths.organizations(event.detail.q))}
      />
      <idp-organization-list organizations={data() ?? []} empty={t('common.none')} cardLabels={organizationCardLabels()} describe={errorText} />
    </Stack>
  );
}
