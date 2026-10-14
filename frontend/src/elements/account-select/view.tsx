/** The default look of idp-account-select. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { initials } from '../shared/initials.js';
import { TONES } from './account-select.js';
import { viewToken } from '@buntubi/sdk/view';
import type { AccountSelectLogic } from './account-select.js';

export const accountSelectView = ({ busy, choose, label, accounts, other }: AccountSelectLogic) =>
  (
      <ul class="idp-accounts">
        <For each={accounts()}>
          {(account, index) => (
            <li>
              <Button
                variant="ghost"
                tone="neutral"
                class="idp-account"
                aria-busy={() => (busy() === account.id ? 'true' : 'false')}
                disabled={busy() !== null}
                onPress={() => choose(account.id)}
              >
                <span class="idp-account-avatar" data-tone={TONES[index() % TONES.length]} aria-hidden="true">
                  <Show when={account.picture} fallback={initials(account.name || account.email)}>
                    <img src={account.picture ?? ''} alt="" />
                  </Show>
                </span>
                <span class="idp-account-text">
                  <span class="idp-account-name">{account.name || account.email}</span>
                  <Show when={account.name}>
                    <span class="idp-account-email">{account.email}</span>
                  </Show>
                </span>
                <span class="idp-account-state">{() => label().signedIn}</span>
              </Button>
            </li>
          )}
        </For>
        <li>
          <Button variant="ghost" tone="neutral" class="idp-account" disabled={busy() !== null} onPress={other}>
            <span class="idp-account-avatar idp-account-add" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span class="idp-account-text">
              <span class="idp-account-other">{() => label().other}</span>
            </span>
          </Button>
        </li>
      </ul>
    );

export const AccountSelectView = viewToken<AccountSelectLogic>('idp-account-select', accountSelectView);
