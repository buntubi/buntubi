/** The organization picker: the developer's organizations, and the way to create one. */
import { Stack } from '@fluixi-ui/layout';
import { Redirect, useRouteData } from '@fluixi/start/router';
import '@idp/elements/organization-tiles';
import '@idp/elements/page-header';
import { usePreferences } from '@idp/shell/preferences';
import { PublicPage } from '../../components/public-page.js';
import { home } from '../../data/developer.js';
import { locale, setLocale, t } from '../../lib/i18n.js';
import { paths } from '../../lib/paths.js';
import type { Home } from '../../lib/types.js';

export const routeData = () => home();

const PLUS = 'M12 5v14M5 12h14';

export default function OrganizationsPage() {
  const data = useRouteData<Home>();
  const { chooseOrganization } = usePreferences('portal', { locale, setLocale });
  return (
    <PublicPage>
      {/* Someone signed out, or not a developer yet, starts at the way in. */}
      <Show when={data()?.me?.developer} fallback={<Redirect to={paths.start()} />}>
        <Stack gap={6}>
          <idp-page-header
            title={t('org.pick.title')}
            intro={t('org.pick.intro')}
            actions={[{ label: t('org.create'), href: paths.newOrganization(), variant: 'solid', icon: PLUS }]}
          />
          <idp-organization-tiles
            organizations={data()?.organizations ?? []}
            title=""
            empty={t('org.pick.empty')}
            platform={t('org.platform')}
            href={paths.organizationPattern()}
            onChoose={(event) => chooseOrganization(event.detail.id)}
          />
        </Stack>
      </Show>
    </PublicPage>
  );
}
