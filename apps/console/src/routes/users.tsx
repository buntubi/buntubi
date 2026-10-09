/** Everyone with an account: what they are, and whether they may sign in. */
import { Stack } from '@fluixi-ui/layout';
import { StickyHead } from '@idp/shell/sticky-head';
import { useLocation, useNavigate, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import '@idp/elements/search-box';
import '@idp/elements/user-list';
import { errorText, t } from '../lib/i18n.js';
import { userListLabels, userRowLabels } from '../lib/labels.js';
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
      <StickyHead>
        <idp-page-header title={t('users.title')} />
        <idp-search-box
          query={location.query.q ?? ''}
          label={t('common.search')}
          onSearch={(event) => navigate(paths.users(event.detail.q), { replace: true })}
        />
      </StickyHead>
      <idp-user-list users={data() ?? []} labels={userListLabels()} rowLabels={userRowLabels()} describe={errorText} />
    </Stack>
  );
}
