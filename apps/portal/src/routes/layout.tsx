/** Every page: the header, the navigation progress bar, the matched route. */
import { useIsRouting } from '@fluixi/start/router';
import { Button } from '@fluixi-ui/button';
import { locale, setLocale, t } from '../lib/i18n.js';
import { auth } from '../services/auth.js';

export default function RootLayout() {
  // Resolved on the server from the session cookie, so the header renders right the first time.
  const user = auth.useUser();
  // The visitor's choice, kept in a cookie so the server renders in it too. Without one, the
  // language the server picked from the browser's Accept-Language stays.
  const prefs = $storage({ scope: 'cookie', namespace: 'portal' });
  const chosen = $persisted(prefs, 'lang', { fallback: '' as 'fr' | 'en' | '' });
  if (chosen()) setLocale(chosen() as 'fr' | 'en');
  const switchLanguage = () => {
    const next = locale() === 'fr' ? 'en' : 'fr';
    chosen.set(next);
    setLocale(next);
  };
  const routing = useIsRouting({ delay: 120 });
  return (
    <>
      <div class="progress" classList={{ active: routing() }} aria-hidden="true" />
      <header class="bar">
        <Link href="/" class="brand">
          <span class="brand-mark" aria-hidden="true" />
          Developers
        </Link>
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
        <Suspense fallback={<p class="muted">{() => t('common.loading')}</p>}>
          <Outlet />
        </Suspense>
      </main>
    </>
  );
}
