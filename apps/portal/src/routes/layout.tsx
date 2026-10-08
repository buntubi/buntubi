/**
 * Every page: the brand handed down, the navigation progress bar, a refused sign-in's notice,
 * and the matched route. Frames (public pages, the workspace shell) draw their own chrome.
 */
import { cache, useIsRouting, useLocation, useNavigate, useRouteData } from '@fluixi/start/router';
import '@idp/elements/auth-notice';
import { authNoticeLabels } from '../lib/auth-notice.js';
import { BrandContext } from '@idp/shell/brand';
import { t } from '../lib/i18n.js';
import type { Brand } from '../lib/types.js';
import { loadBrand } from '../server/developer.js';
import { auth } from '../services/auth.js';

const brand = cache(() => loadBrand(), 'brand');
export const routeData = () => brand();

export default function RootLayout() {
  const data = useRouteData<Brand>();
  const routing = useIsRouting({ delay: 120 });
  const location = useLocation();
  const navigate = useNavigate();
  // Drops the error from the address once read; the rest of the query stays.
  const dismissAuthError = () => {
    const query = new URLSearchParams(location.search);
    query.delete('auth_error');
    navigate(`${location.pathname}${query.size ? `?${query}` : ''}`, { replace: true });
  };
  return (
    <BrandContext.Provider value={() => data() ?? {}}>
      <div class="progress" classList={{ active: routing() }} aria-hidden="true" />
      <dp-auth-notice
        class="auth-notice"
        error={location.query.auth_error ?? ''}
        labels={authNoticeLabels()}
        onRetry={() => auth.signIn({ returnTo: location.pathname })}
        onDismiss={dismissAuthError}
      />
      <Suspense fallback={<p class="muted loading">{() => t('common.loading')}</p>}>
        <Outlet />
      </Suspense>
    </BrandContext.Provider>
  );
}
