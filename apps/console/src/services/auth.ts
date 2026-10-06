/**
 * Sign-in through the identity provider. The tokens live on this server (`tokens: 'server'`):
 * the browser holds an encrypted cookie and calls `/auth/*`, which app.config.server.ts mounts.
 */
import { authModule, createAuthService } from '@fluixi/oauth2';
import { publicEnv } from '@fluixi/start/env';

const env = publicEnv();
export const appUrl = env.APP_URL ?? 'http://localhost:3420';
export const idpUrl = env.IDP_URL ?? 'http://localhost:5010';
export const SCOPES = ['openid', 'profile', 'email', 'admin'];

export interface Owner {
  sub: string;
  email?: string;
  name?: string;
}

export const auth = createAuthService<Owner>({
  config: {
    tokens: 'server',
    redirectUri: `${appUrl}/auth/callback`,
    scopes: SCOPES,
  },
});

export const AuthModule = authModule(auth);
