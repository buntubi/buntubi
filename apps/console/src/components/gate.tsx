/**
 * Why the console is closed to this visitor: not signed in, not an admin, or signed in without
 * the second step the console requires. Shown instead of every page while it applies.
 */
import { Button } from '@fluixi-ui/button';
import type { ComponentChild } from '@fluixi/dom';
import { t } from '../lib/i18n.js';
import type { Gate as GateCode } from '../lib/types.js';
import { auth, idpUrl } from '../services/auth.js';

export function Gate(props: { gate: GateCode }): ComponentChild {
  return (
    <main class="gate">
      <style scoped>{`
        .gate { min-height: 100vh; display: grid; place-items: center; padding: 32px 24px; box-sizing: border-box; }
        .card { max-width: 480px; display: grid; gap: 14px; }
        h1 { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.02em; }
        p { margin: 0; color: var(--dp-muted); line-height: 1.55; }
        .card :deep(a) { color: var(--dp-accent-ink); font-weight: 500; text-decoration: none; }
        .links { display: flex; flex-wrap: wrap; gap: 20px; }
      `}</style>
      <div class="card">
        <Switch>
          <Match when={props.gate === 'signed_out'}>
            <h1>{() => t('gate.signedOut.title')}</h1>
            <p>{() => t('gate.signedOut.text')}</p>
            <div>
              <Button variant="solid" onPress={() => auth.signIn({ returnTo: '/' })}>
                {() => t('gate.signIn')}
              </Button>
            </div>
          </Match>
          <Match when={props.gate === 'not_admin'}>
            <h1>{() => t('gate.notAdmin.title')}</h1>
            <p>{() => t('gate.notAdmin.text')}</p>
            <a href="/auth/logout">{() => t('gate.otherAccount')}</a>
          </Match>
          <Match when={props.gate === 'mfa_required'}>
            <h1>{() => t('gate.mfa.title')}</h1>
            <p>{() => t('gate.mfa.text')}</p>
            {/* The session the console holds was opened without the second factor: once it is
                set up, a new sign-in is what brings it. */}
            <div class="links">
              <a href={`${idpUrl}/account`}>{() => t('gate.mfa.account')}</a>
              <a href="/auth/logout">{() => t('gate.signOut')}</a>
            </div>
          </Match>
        </Switch>
      </div>
    </main>
  );
}
