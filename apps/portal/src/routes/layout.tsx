/**
 * Every page: the brand handed down, the navigation progress bar, a refused sign-in's notice,
 * and the matched route. Frames (public pages, the workspace shell) draw their own chrome.
 */
import { provide } from '@fluixi/start/di';
import { Navigation, type NavigationOptions } from '@buntu/sdk/navigation';
import { viewsOf } from '@buntu/sdk/plugins';
import { overrideViews } from '@buntu/sdk/view';
import uiPlugins from 'virtual:idp-ui-plugins';
import { useIsRouting, useLocation, useNavigate, useRouteData } from '@fluixi/start/router';
import '@idp/elements/auth-notice';
import { authNoticeLabels } from '../lib/auth-notice.js';
import { BrandContext } from '@idp/shell/brand';
import { t } from '../lib/i18n.js';
import type { Brand } from '../lib/types.js';
import { auth } from '../services/auth.js';
import { PageBoundary } from '../components/page-boundary.js';
import { brand } from '../data/developer.js';

// A deployment's views in place of the elements' own, before anything renders.
overrideViews(viewsOf(uiPlugins));

export const routeData = () => brand();

export default function RootLayout() {
  const data = useRouteData<Brand>();
  const routing = useIsRouting({ delay: 120 });
  const location = useLocation();
  const navigate = useNavigate();
  // Elements move through the router: Navigation from @buntu/sdk/navigation.
  provide([{ provide: Navigation, useValue: { go: (href: string, options?: NavigationOptions) => navigate(href, options) } }]);
  // Drops the error from the address once read; the rest of the query stays.
  const dismissAuthError = () => {
    const query = new URLSearchParams(location.search);
    query.delete('auth_error');
    navigate(`${location.pathname}${query.size ? `?${query}` : ''}`, { replace: true });
  };
  return (
    <BrandContext.Provider value={() => data() ?? {}}>
      <div class="progress" classList={{ active: routing() }} aria-hidden="true" />
      <idp-auth-notice
        class="auth-notice"
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
    </BrandContext.Provider>
  );
}
