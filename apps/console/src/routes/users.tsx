/** Everyone with an account: what they are, and whether they may sign in. */
import { Stack } from '@fluixi-ui/layout';
import { useLocation, useNavigate, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import '@idp/elements/search-box';
import '@idp/elements/user-list';
import { errorText, t } from '../lib/i18n.js';
import { userRowLabels } from '../lib/labels.js';
import { searchOf } from '../lib/params.js';
import type { UserRow } from '../lib/types.js';
import { paths } from '../lib/paths.js';
import '@idp/elements/page-header';
import { users } from '../data/admin.js';

export const routeData = (args: RouteDataArgs) => users(searchOf(args, 'q'));

export default function UsersPage() {
  const data = useRouteData<UserRow[]>();
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <Stack gap={5}>
      <idp-page-header title={t('users.title')} />
      <idp-search-box
        query={location.query.q ?? ''}
        label={t('common.search')}
        button={t('common.search')}
        onSearch={(event) => navigate(paths.users(event.detail.q))}
      />
      <idp-user-list users={data() ?? []} empty={t('common.none')} rowLabels={userRowLabels()} describe={errorText} />
    </Stack>
  );
}
