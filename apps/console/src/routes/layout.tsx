/** Every page: the console's navigation, the progress bar, the matched route. */
import { useIsRouting, useLocation, useNavigate } from '@fluixi/start/router';
import '@idp/elements/auth-notice';
import { Button } from '@fluixi-ui/button';
import { locale, setLocale, t } from '../lib/i18n.js';
import { authNoticeLabels } from '../lib/auth-notice.js';
import { auth } from '../services/auth.js';

const SECTIONS = [
  ['/', 'nav.overview'],
  ['/reviews', 'nav.reviews'],
  ['/organizations', 'nav.organizations'],
  ['/users', 'nav.users'],
  ['/scopes', 'nav.scopes'],
  ['/products', 'nav.products'],
] as const;

export default function RootLayout() {
  const routing = useIsRouting({ delay: 120 });
  const location = useLocation();
  const isCurrent = (href: string) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);
  // Resolved on the server from the session cookie, so the header renders right the first time.
  const user = auth.useUser();
  const prefs = $storage({ scope: 'cookie', namespace: 'console' });
  const chosen = $persisted(prefs, 'lang', { fallback: '' as 'fr' | 'en' | '' });
  if (chosen()) setLocale(chosen() as 'fr' | 'en');
  const switchLanguage = () => {
    const next = locale() === 'fr' ? 'en' : 'fr';
    chosen.set(next);
    setLocale(next);
  };
  const navigate = useNavigate();
  // Drops the error from the address once read; the rest of the query stays.
  const dismissAuthError = () => {
    const query = new URLSearchParams(location.search);
    query.delete('auth_error');
    navigate(`${location.pathname}${query.size ? `?${query}` : ''}`, { replace: true });
  };
  return (
    <>
      <div class="progress" classList={{ active: routing() }} aria-hidden="true" />
      <header class="bar">
        <Link href="/" class="brand">
          <span class="brand-mark" aria-hidden="true" />
          Console
        </Link>
        <Show when={user()}>
          <nav class="sections">
            <For each={SECTIONS}>
              {([href, key]) => (
                <Link href={href} class="section-link" activeClass="current" active={() => isCurrent(href)}>
                  {() => t(key)}
                </Link>
              )}
            </For>
          </nav>
        </Show>
        <nav class="bar-links">
          <Button variant="ghost" class="bar-link" onPress={switchLanguage}>
            {() => t('nav.language')}
          </Button>
          <Show when={user()}>
            <a class="bar-link" href="/auth/logout">
              {() => t('nav.signOut')}
            </a>
          </Show>
        </nav>
      </header>
      <main class="page">
        <dp-auth-notice
          error={location.query.auth_error ?? ''}
          labels={authNoticeLabels()}
          onRetry={() => auth.signIn({ returnTo: location.pathname })}
          onDismiss={dismissAuthError}
        />
        <Suspense fallback={<p class="muted">{() => t('common.loading')}</p>}>
          <Outlet />
        </Suspense>
      </main>
    </>
  );
}
