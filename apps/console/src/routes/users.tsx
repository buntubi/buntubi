/** Everyone with an account: what they are, and whether they may sign in. */
import { cache, useLocation, useNavigate, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import '@idp/elements/search-box';
import '@idp/elements/user-list';
import { errorText, t } from '../lib/i18n.js';
import { userRowLabels } from '../lib/labels.js';
import { searchOf } from '../lib/params.js';
import type { UserRow } from '../lib/types.js';
import { loadUsers } from '../server/admin.js';

const users = cache((q: string) => loadUsers(q), 'users');
export const routeData = (args: RouteDataArgs) => users(searchOf(args, 'q'));

export default function UsersPage() {
  const data = useRouteData<UserRow[]>();
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <div class="stack">
      <header class="page-head">
        <h1>{() => t('users.title')}</h1>
      </header>
      <idp-search-box
        query={location.query.q ?? ''}
        label={t('common.search')}
        button={t('common.search')}
        onSearch={(event) => navigate(event.detail.q ? `/users?q=${encodeURIComponent(event.detail.q)}` : '/users')}
      />
      <idp-user-list users={data() ?? []} empty={t('common.none')} rowLabels={userRowLabels()} describe={errorText} />
    </div>
  );
}
