/**
 * Every console page: the workspace shell the portal uses, with the console's sections, the
 * progress bar, a refused sign-in's notice, and the matched route.
 */
import { revalidate, useIsRouting, useLocation, useNavigate, useRouteData } from '@fluixi/start/router';
import '@idp/elements/page-error';
import '@idp/elements/access-gate';
import '@idp/elements/auth-notice';
import type { SidebarGroup } from '@idp/elements/sidebar/logic';
import { BrandContext } from '@idp/shell/brand';
import { icons } from '@idp/shell/icons';
import { usePreferences } from '@idp/shell/preferences';
import { Shell, type Crumb } from '@idp/shell/shell';
import { sectionsOf } from '@buntu/sdk/plugins';
import type { Brand } from '@buntu/sdk/types';
import uiPlugins from 'virtual:idp-ui-plugins';
import type { Gate as GateCode } from '../lib/types.js';
import { PageBoundary } from '../components/page-boundary.js';
import { authNoticeLabels } from '../lib/auth-notice.js';
import { locale, setLocale, t } from '../lib/i18n.js';
import { accessGateLabels, pageErrorLabels, shellLabels, sidebarLabels } from '../lib/labels.js';
import { auth, idpUrl } from '../services/auth.js';
import { paths } from '../lib/paths.js';
import { brand, enabledPlugins, overview } from '../data/admin.js';


interface ShellData {
  brand: Brand;
  /** Why the console is closed to this visitor, or null. */
  gate: GateCode;
  pending: number;
  /** The plugins the provider runs, by id. */
  plugins: string[];
  /** The provider did not answer: the console says so instead of showing an empty frame. */
  unreachable?: boolean;
}

export const routeData = async ({ location }: { location: () => { query: Record<string, string> } }): Promise<ShellData> => {
  const down: ShellData = { brand: {} as Brand, gate: null, pending: 0, plugins: [], unreachable: true };
  // The sign-in found the provider down and came back to say so.
  if (location().query.auth_error === 'provider_unreachable') return down;
  try {
    const [platform, counts] = await Promise.all([brand(), overview()]);
    // The plugins' pages only once the console is open to this visitor.
    const plugins = counts.gate ? [] : await enabledPlugins();
    return { brand: platform, gate: counts.gate, pending: counts.overview?.pending_reviews ?? 0, plugins };
  } catch {
    // Everything the shell needs comes from the provider: it is down or out of reach.
    return down;
  }
};

const SECTIONS = [
  { href: paths.overview(), key: 'nav.overview', icon: icons.home, group: 'decide' },
  { href: paths.reviews(), key: 'nav.reviews', icon: icons.shield, group: 'decide' },
  { href: paths.organizations(), key: 'nav.organizations', icon: icons.building, group: 'manage' },
  { href: paths.apps(), key: 'nav.apps', icon: icons.apps, group: 'manage' },
  { href: paths.users(), key: 'nav.users', icon: icons.user, group: 'manage' },
  { href: paths.scopes(), key: 'nav.scopes', icon: icons.tag, group: 'manage' },
  { href: paths.products(), key: 'nav.products', icon: icons.box, group: 'manage' },
] as const;

export default function RootLayout() {
  const data = useRouteData<ShellData>();
  const routing = useIsRouting({ delay: 120 });
  const location = useLocation();
  const navigate = useNavigate();
  // Resolved on the server from the session cookie, so the shell renders right the first time.
  const user = auth.useUser();
  const { switchLanguage, sidebarFolded: collapsed } = usePreferences('console', { locale, setLocale });
  const current = (href: string) => (href === paths.overview() ? location.pathname === href : location.pathname.startsWith(href));
  // The deployment's own pages, from its plugins, after the console's.
  const extensions = () =>
    sectionsOf(uiPlugins, 'console', data()?.plugins ?? []).map(({ plugin, section }) => ({
      label: section.label[locale()],
      href: paths.plugin(plugin, section.key),
      icon: section.icon,
      current: current(paths.plugin(plugin, section.key)),
    }));
  const groups = (): SidebarGroup[] => [
    ...(['decide', 'manage'] as const).map((group) => ({
      label: t(`shell.${group}`),
      items: SECTIONS.filter((section) => section.group === group).map((section) => ({
        label: t(section.key),
        href: section.href,
        icon: section.icon,
        current: current(section.href),
        count: section.href === paths.reviews() && data()?.pending ? data()?.pending : undefined,
      })),
    })),
    ...(extensions().length ? [{ label: t('shell.extensions'), items: extensions() }] : []),
  ];
  const crumbs = (): Crumb[] => {
    const section = [...SECTIONS].reverse().find((entry) => current(entry.href));
    const extension = extensions().find((entry) => entry.current);
    return [{ label: t('shell.platform'), href: paths.overview() }, { label: section ? t(section.key) : (extension?.label ?? '') }];
  };
  // Drops the error from the address once read; the rest of the query stays.
  const dismissAuthError = () => {
    const query = new URLSearchParams(location.search);
    query.delete('auth_error');
    navigate(`${location.pathname}${query.size ? `?${query}` : ''}`, { replace: true });
  };
  const platform = () => data()?.brand.name ?? '';
  return (
    <Show
      when={!data()?.unreachable}
      fallback={
        <main class="unreachable">
          <idp-page-error
            message={t('page.unreachable')}
            labels={pageErrorLabels()}
            onRetry={() => {
              // Back to the page without the provider's error: loading it again checks the session
              // or starts the sign-in afresh.
              if (location.query.auth_error) window.location.assign(location.pathname);
              else revalidate(() => true);
            }}
          />
        </main>
      }
    >
    <BrandContext.Provider value={() => data()?.brand ?? {}}>
      <div class="progress" classList={{ active: routing() }} aria-hidden="true" />
      {/* Closed: no page renders, so no page asks the admin API what it would refuse. */}
      <Show
        when={!data()?.gate}
        fallback={
          <idp-access-gate
            reason={data()?.gate ?? 'signed_out'}
            accountHref={`${idpUrl}/account`}
            signOutHref="/auth/logout"
            labels={accessGateLabels()}
            onSignin={() => auth.signIn({ returnTo: paths.overview() })}
          />
        }
      >
      <Shell
        brand={{ name: platform(), href: paths.overview() }}
        context={null}
        groups={groups()}
        sidebarLabels={sidebarLabels()}
        collapsed={collapsed()}
        onToggle={(folded) => collapsed.set(folded)}
        crumbs={crumbs()}
        user={user() ? { name: user()?.name || user()?.email || '', detail: t('users.admin') } : null}
        signOutHref="/auth/logout"
        onLanguage={switchLanguage}
        labels={shellLabels()}
      >
        <idp-auth-notice
          error={location.query.auth_error ?? ''}
          labels={authNoticeLabels()}
          onRetry={() => auth.signIn({ returnTo: location.pathname })}
          onDismiss={dismissAuthError}
        />
        <Suspense fallback={<p class="page-intro">{() => t('common.loading')}</p>}>
          <PageBoundary>
            <Outlet />
          </PageBoundary>
        </Suspense>
      </Shell>
      </Show>
    </BrandContext.Provider>
    </Show>
  );
}
