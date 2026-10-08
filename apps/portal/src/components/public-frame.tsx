/** The frame of the pages outside a workspace: landing, developer terms, first organization. */
import type { ComponentChild } from '@fluixi/dom';
import { Button } from '@fluixi-ui/button';
import { markOf, useBrand } from '../lib/brand.js';
import { t } from '../lib/i18n.js';
import { usePreferences } from '../lib/preferences.js';
import { auth } from '../services/auth.js';

export function PublicFrame(props: { children?: ComponentChild }): ComponentChild {
  const brand = useBrand();
  const user = auth.useUser();
  const { switchLanguage } = usePreferences();
  const children = props.children;
  return (
    <div class="public">
      <header class="bar">
        <Link href="/" class="brand">
          <span class="brand-mark" aria-hidden="true">
            {() => markOf(brand().name)}
          </span>
          {() => `${brand().name ?? ''} ${t('shell.developers')}`.trim()}
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
      <main class="page">{children}</main>
    </div>
  );
}
