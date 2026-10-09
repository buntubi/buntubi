/** The portal's pages outside a workspace, in the shell's public frame with this app's wiring. */
import type { ComponentChild } from '@fluixi/dom';
import { useBrand } from '@idp/shell/brand';
import { usePreferences } from '@idp/shell/preferences';
import { PublicFrame } from '@idp/shell/public-frame';
import { locale, setLocale } from '../lib/i18n.js';
import { publicFrameLabels } from '../lib/labels.js';
import { paths } from '../lib/paths.js';
import { auth } from '../services/auth.js';

export function PublicPage(props: { children?: ComponentChild }): ComponentChild {
  const brand = useBrand();
  const user = auth.useUser();
  const { switchLanguage, forgetOrganization } = usePreferences('portal', { locale, setLocale });
  const children = props.children;
  return (
    <PublicFrame
      brand={{ name: brand().name ?? '', href: paths.start() }}
      signedIn={Boolean(user())}
      signOutHref="/auth/logout"
      onSignOut={forgetOrganization}
      onLanguage={switchLanguage}
      labels={publicFrameLabels()}
    >
      {children}
    </PublicFrame>
  );
}
