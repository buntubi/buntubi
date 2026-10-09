/** Every developer organization: who owns it, what it was approved for, suspension. */
import { cache, useLocation, useNavigate, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import '@idp/elements/organization-list';
import '@idp/elements/search-box';
import { errorText, t } from '../lib/i18n.js';
import { organizationCardLabels } from '../lib/labels.js';
import { searchOf } from '../lib/params.js';
import type { OrganizationRow } from '../lib/types.js';
import { loadOrganizations } from '../server/admin.js';

const organizations = cache((q: string) => loadOrganizations(q), 'organizations');
export const routeData = (args: RouteDataArgs) => organizations(searchOf(args, 'q'));

export default function OrganizationsPage() {
  const data = useRouteData<OrganizationRow[]>();
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div class="stack">
      <header class="page-head">
        <h1>{() => t('organizations.title')}</h1>
      </header>
      <idp-search-box
        query={location.query.q ?? ''}
        label={t('common.search')}
        button={t('common.search')}
        onSearch={(event) => navigate(event.detail.q ? `/organizations?q=${encodeURIComponent(event.detail.q)}` : '/organizations')}
      />
      <idp-organization-list organizations={data() ?? []} empty={t('common.none')} cardLabels={organizationCardLabels()} describe={errorText} />
    </div>
  );
}
