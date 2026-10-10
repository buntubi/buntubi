/** One account: its profile, the facts about it, and what an admin may do to it. */
import { Stack } from '@fluixi-ui/layout';
import { useRouteData, type RouteDataArgs } from '@fluixi/start/router';
import '@idp/elements/not-found';
import '@idp/elements/page-header';
import '@idp/elements/user-profile';
import { me, user } from '../../data/admin.js';
import { errorText, locale, t } from '../../lib/i18n.js';
import { formMessages, userProfileLabels } from '../../lib/labels.js';
import { paramOf } from '../../lib/params.js';
import { paths } from '../../lib/paths.js';
import type { Me, UserPage } from '../../lib/types.js';

interface UserData {
  page: UserPage | null;
  me: Me;
}

export const routeData = async (args: RouteDataArgs): Promise<UserData> => {
  const [page, viewer] = await Promise.all([user(paramOf(args, 'id')), me()]);
  return { page, me: viewer };
};

const nameOf = (page: UserPage | null | undefined) =>
  page ? `${page.user.given_name} ${page.user.family_name}`.trim() || page.user.email : '';

export default function UserPage() {
  const data = useRouteData<UserData>();
  return (
    <Show
      when={data()?.page}
      fallback={<idp-not-found href={paths.users()} labels={{ title: t('users.notFound'), text: '', back: t('users.back') }} />}
    >
      <Stack gap={5}>
        <idp-page-header
          eyebrow={t('users.title')}
          title={nameOf(data()?.page)}
          intro={data()?.page?.user.email ?? ''}
          actions={[{ label: t('users.back'), href: paths.users(), variant: 'outline' }]}
        />
        <idp-user-profile
          page={data()?.page ?? null}
          viewerId={data()?.me.id ?? ''}
          managesAdmins={data()?.me.superadmin ?? false}
          locale={locale()}
          labels={userProfileLabels()}
          messages={formMessages()}
          describe={errorText}
        />
      </Stack>
    </Show>
  );
}
