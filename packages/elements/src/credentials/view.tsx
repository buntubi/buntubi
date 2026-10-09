/** The default look: title and environment on one row, the client card, then keys beside signing keys. */
import type { ApiKey, App } from '@idp/sdk/types';
import { viewToken } from '../view.js';
import type { CredentialsLogic } from './logic.js';

/** What the page hands its blocks, besides its own state. */
export interface CredentialsHost {
  app: () => App | null;
  keys: () => ApiKey[];
  organization: () => string;
  jwksUrl: () => string;
  redirectsHref: () => string;
  canManage: () => boolean;
  secret: () => string;
  locale: () => string;
  describe: () => ((error: unknown) => string) | undefined;
}

export const credentialsView = (c: CredentialsLogic & CredentialsHost) => (
  <div part="credentials" class="credentials">
    <style scoped>{`
      .credentials { display: grid; gap: 20px; }
      .head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 12px 24px; }
      .pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; align-items: start; }
      @media (max-width: 900px) { .pair { grid-template-columns: 1fr; } }
    `}</style>
    <div class="head">
      <idp-page-header title={c.labels().title} intro={c.labels().intro[c.environment()]} />
      <idp-segmented
        options={c.environments()}
        value={c.environment()}
        label={c.labels().environment}
        size="md"
        onChange={(event) => c.choose(event.detail.value)}
      />
    </div>
    <idp-oauth-client
      app={c.app()}
      secret={c.secret()}
      redirectsHref={c.redirectsHref()}
      canManage={c.canManage()}
      locale={c.locale()}
      labels={c.labels().client}
      describe={c.describe()}
    />
    <div class="pair">
      <idp-api-keys
        keys={c.keys()}
        organization={c.organization()}
        environment={c.environment()}
        environmentName={c.labels().environments[c.environment()]}
        canManage={c.canManage()}
        locale={c.locale()}
        labels={c.labels().keys}
        describe={c.describe()}
      />
      <idp-signing-keys jwksUrl={c.jwksUrl()} labels={c.labels().signing} />
    </div>
  </div>
);

export const CredentialsView = viewToken<CredentialsLogic & CredentialsHost>('CredentialsView', credentialsView);
