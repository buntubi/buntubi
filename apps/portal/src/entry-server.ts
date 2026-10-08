import '@idp/theme/tokens.css';
import './styles.css';
import App from './app.js';
import { renderRequestAsync, renderToBodyStream } from '@fluixi/server';
import { localeFor, setLocale } from './lib/i18n.js';

// The locale lives on the render's request context, so it is set as the render starts.
const withLocale = (request?: Request) => (props: { url: string }) => {
  if (request) setLocale(localeFor(request));
  return App(props);
};

// The request goes on the render, so route data loaded during the server render sees the
// session the auth middleware resolved, and calls the developer API as the right person.
export function render(url: string, request?: Request): Promise<string> {
  return renderRequestAsync(withLocale(request), { url, request });
}

export function renderStream(url: string, request?: Request): ReadableStream<Uint8Array> {
  return renderToBodyStream(withLocale(request), { url, request });
}

import '@fluixi/start/server-fns';
export { isServerFnRequest, handleServerFn } from '@fluixi/start/server-fn';
export { isApiRequest, handleApiRequest } from '@fluixi/start/api-routes';
