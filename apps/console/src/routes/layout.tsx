/**
 * Every console page: the workspace shell the portal uses, with the console's sections, the
 * progress bar, a refused sign-in's notice, and the matched route.
 */
import { cache, useIsRouting, useLocation, useNavigate, useRouteData } from '@fluixi/start/router';
import '@idp/elements/access-gate';
import '@idp/elements/auth-notice';
import type { SidebarGroup } from '@idp/elements/sidebar/logic';
import { BrandContext, markOf } from '@idp/shell/brand';
import { icons } from '@idp/shell/icons';
import { usePreferences } from '@idp/shell/preferences';
import { Shell, type Crumb } from '@idp/shell/shell';
import type { Brand } from '@idp/sdk/types';
import type { Gate as GateCode } from '../lib/types.js';
import { PageBoundary } from '../components/page-boundary.js';
import { authNoticeLabels } from '../lib/auth-notice.js';
import { locale, setLocale, t } from '../lib/i18n.js';
import { accessGateLabels, shellLabels, sidebarLabels } from '../lib/labels.js';
import { loadBrand, loadOverview } from '../server/admin.js';
import { auth, idpUrl } from '../services/auth.js';

const brand = cache(() => loadBrand(), 'brand');
// The same entry the overview page reads, so the count costs no second request.
const overview = cache(() => loadOverview(), 'overview');

interface ShellData {
  brand: Brand;
  /** Why the console is closed to this visitor, or null. */
  gate: GateCode;
  pending: number;
}

export const routeData = async (): Promise<ShellData> => {
  const [platform, counts] = await Promise.all([brand(), overview()]);
  return { brand: platform, gate: counts.gate, pending: counts.overview?.pending_reviews ?? 0 };
};

const SECTIONS = [
  { href: '/', key: 'nav.overview', icon: icons.home, group: 'decide' },
  { href: '/reviews', key: 'nav.reviews', icon: icons.shield, group: 'decide' },
  { href: '/organizations', key: 'nav.organizations', icon: icons.building, group: 'manage' },
  { href: '/users', key: 'nav.users', icon: icons.user, group: 'manage' },
  { href: '/scopes', key: 'nav.scopes', icon: icons.tag, group: 'manage' },
  { href: '/products', key: 'nav.products', icon: icons.box, group: 'manage' },
] as const;

export default function RootLayout() {
  const data = useRouteData<ShellData>();
  const routing = useIsRouting({ delay: 120 });
  const location = useLocation();
  const navigate = useNavigate();
  // Resolved on the server from the session cookie, so the shell renders right the first time.
  const user = auth.useUser();
  const { switchLanguage, sidebarFolded: collapsed } = usePreferences('console', { locale, setLocale });
  const current = (href: string) => (href === '/' ? location.pathname === '/' : location.pathname.startsWith(href));
  const groups = (): SidebarGroup[] =>
    (['decide', 'manage'] as const).map((group) => ({
      label: t(`shell.${group}`),
      items: SECTIONS.filter((section) => section.group === group).map((section) => ({
        label: t(section.key),
        href: section.href,
        icon: section.icon,
        current: current(section.href),
        count: section.href === '/reviews' && data()?.pending ? data()?.pending : undefined,
      })),
    }));
  const crumbs = (): Crumb[] => {
    const section = [...SECTIONS].reverse().find((entry) => current(entry.href));
    return [{ label: t('shell.platform'), href: '/' }, { label: section ? t(section.key) : '' }];
  };
  // Drops the error from the address once read; the rest of the query stays.
  const dismissAuthError = () => {
    const query = new URLSearchParams(location.search);
    query.delete('auth_error');
    navigate(`${location.pathname}${query.size ? `?${query}` : ''}`, { replace: true });
  };
  const platform = () => data()?.brand.name ?? '';
  return (
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
            onSignin={() => auth.signIn({ returnTo: '/' })}
          />
        }
      >
      <Shell
        brand={{ name: platform(), href: '/' }}
        context={{ name: platform(), detail: t('shell.product'), mark: markOf(platform()) }}
        groups={groups()}
        sidebarLabels={sidebarLabels()}
        collapsed={collapsed()}
        onToggle={(folded) => collapsed.set(folded)}
        crumbs={crumbs()}
        user={user() ? { name: user()?.name ?? '', email: user()?.email ?? '' } : null}
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
  );
}
