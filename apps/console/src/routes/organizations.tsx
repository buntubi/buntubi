/** Every developer organization: who owns it, what it was approved for, suspension. */
import { Stack } from '@fluixi-ui/layout';
import { StickyHead } from '@idp/shell/sticky-head';
import { useLocation, useNavigate, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import '@idp/elements/organization-list';
import '@idp/elements/search-box';
import { errorText, t } from '../lib/i18n.js';
import { organizationListLabels, organizationRowLabels } from '../lib/labels.js';
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
      <StickyHead>
        <idp-page-header title={t('organizations.title')} />
        <idp-search-box
          query={location.query.q ?? ''}
          label={t('common.search')}
          onSearch={(event) => navigate(paths.organizations(event.detail.q), { replace: true })}
        />
      </StickyHead>
      <idp-organization-list organizations={data() ?? []} labels={organizationListLabels()} rowLabels={organizationRowLabels()} describe={errorText} />
    </Stack>
  );
}
