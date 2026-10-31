import '@idp/theme/tokens.css';
import '@idp/theme/fonts.css';
import '@fluixi-ui/skin-soft/styles.css';
import '@fluixi-ui/skin-material/styles.css';
import '@fluixi-ui/skin-paper/styles.css';
import '@fluixi-ui/skin-glass/styles.css';
import './styles.css';
import App from './app.js';
import { renderRequestAsync, renderToBodyStream } from '@fluixi/server';
import { platformSkin } from '@idp/theme/platform-skin';
import { publicEnv } from '@fluixi/start/env';
import { localeFor, setLocale } from './lib/i18n.js';

// The skin a visitor without a choice sees, the deployment's IDP_BRAND_SKIN.
const skin = platformSkin(() => publicEnv().IDP_URL ?? '');
// Fetched as the server starts, so its first page already has it.
void skin.get();

// The locale lives on the render's request context, so it is set as the render starts.
const withLocale = (request: Request | undefined, defaultSkin: string | undefined) => (props: { url: string }) => {
  if (request) setLocale(localeFor(request));
  return App({ ...props, defaultSkin });
};

// The request goes on the render, so route data loaded during the server render sees the
// session the auth middleware resolved, and calls the developer API as the right person.
export function render(url: string, request?: Request): Promise<string> {
  return skin.get().then((defaultSkin) => renderRequestAsync(withLocale(request, defaultSkin), { url, request }));
}

export function renderStream(url: string, request?: Request): ReadableStream<Uint8Array> {
  return renderToBodyStream(withLocale(request, skin.current()), { url, request });
}

import '@fluixi/start/server-fns';
export { isServerFnRequest, handleServerFn } from '@fluixi/start/server-fn';
export { isApiRequest, handleApiRequest } from '@fluixi/start/api-routes';
