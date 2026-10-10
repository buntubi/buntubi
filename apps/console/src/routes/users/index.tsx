/** Everyone with an account: what they are, when they came and last signed in, and the way to each. */
import { Stack } from '@fluixi-ui/layout';
import { StickyHead } from '@idp/shell/sticky-head';
import { useLocation, useNavigate, useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import { icons } from '@idp/shell/icons';
import '@idp/elements/page-header';
import '@idp/elements/search-box';
import '@idp/elements/user-list';
import { me, users } from '../../data/admin.js';
import { errorText, locale, t } from '../../lib/i18n.js';
import { userListLabels, userRowLabels } from '../../lib/labels.js';
import { searchOf } from '../../lib/params.js';
import { paths } from '../../lib/paths.js';
import type { Me, UserRow } from '../../lib/types.js';

interface UsersData {
  users: UserRow[];
  me: Me;
}

export const routeData = async (args: RouteDataArgs): Promise<UsersData> => {
  const [list, viewer] = await Promise.all([users(searchOf(args, 'q')), me()]);
  return { users: list, me: viewer };
};

export default function UsersPage() {
  const data = useRouteData<UsersData>();
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <Stack gap={5}>
      <StickyHead>
        <idp-page-header
          title={t('users.title')}
          actions={[{ label: t('users.new'), href: paths.newUser(), variant: 'solid', icon: icons.user }]}
        />
        <idp-search-box
          query={location.query.q ?? ''}
          label={t('common.search')}
          onSearch={(event) => navigate(paths.users(event.detail.q), { replace: true })}
        />
      </StickyHead>
      <idp-user-list
        users={data()?.users ?? []}
        managesAdmins={data()?.me.superadmin ?? false}
        href={paths.userPattern()}
        locale={locale()}
        labels={userListLabels()}
        rowLabels={userRowLabels()}
        describe={errorText}
      />
    </Stack>
  );
}
