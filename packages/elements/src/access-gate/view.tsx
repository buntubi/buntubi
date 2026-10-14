/** The gate's default look: a centred card with the reason and its way out. */
import { Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { viewToken } from '../view.js';
import type { AccessGateLogic } from './logic.js';

export const accessGateView = (g: AccessGateLogic) => (
  <main part="gate" class="gate">
    <style scoped>{`
      .gate { min-height: 100vh; display: grid; place-items: center; padding: 32px 24px; box-sizing: border-box; }
      .card { max-width: 480px; display: grid; gap: 14px; }
      h1 { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
      p { margin: 0; color: var(--idp-muted); line-height: 1.55; }
      .links { display: flex; flex-wrap: wrap; gap: 20px; }
      a { color: var(--idp-accent-ink); font-weight: 500; text-decoration: none; }
    `}</style>
    <div class="card">
      <h1>{() => g.labels().titles[g.reason()]}</h1>
      <p>{() => g.labels().texts[g.reason()]}</p>
      <Show when={g.reason() === 'signed_out'}>
        <div>
          <Button variant="solid" onPress={g.signIn}>
            {() => g.labels().signIn}
          </Button>
        </div>
      </Show>
      <Show when={g.reason() === 'not_admin'}>
        <div class="links">
          <a href={() => g.signOutHref()}>{() => g.labels().otherAccount}</a>
        </div>
      </Show>
      <Show when={g.reason() === 'mfa_required'}>
        {/* The session was opened without the second factor: once set up, a new sign-in brings it. */}
        <div class="links">
          <a href={() => g.accountHref()}>{() => g.labels().account}</a>
          <a href={() => g.signOutHref()}>{() => g.labels().signOut}</a>
        </div>
      </Show>
    </div>
  </main>
);

export const AccessGateView = viewToken<AccessGateLogic>('idp-access-gate', accessGateView);
