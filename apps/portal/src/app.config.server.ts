// Only the server build loads this file, so the client secret and the cookie key never reach
// the browser bundle.
import { defineApp } from '@fluixi/start/app';
import { authServerModule } from '@fluixi/oauth2/server';
import { serverEnv } from '@fluixi/start/env';
import { appUrl, idpUrl, SCOPES } from './services/auth.js';

export default defineApp({
  imports: [
    authServerModule({
      issuer: idpUrl,
      clientId: serverEnv('PORTAL_CLIENT_ID') ?? 'developer-portal',
      clientSecret: serverEnv('PORTAL_CLIENT_SECRET', { required: true }),
      cookieSecret: serverEnv('SESSION_SECRET', { required: true }),
      redirectUri: `${appUrl}/auth/callback`,
      scopes: SCOPES,
      defaultReturnTo: '/',
      // Someone already signed in at the provider arrives signed in; a stranger sees the landing.
      signIn: 'silent',
      // A workspace is private: a signed-out visit there goes to sign in.
      protectedPaths: ['/o'],
      secureCookie: appUrl.startsWith('https://'),
    }),
  ],
});
