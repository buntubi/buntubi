/**
 * The accounts signed in on this browser. Choosing one emits `select` after the host's `action`
 * resolves; "another account" emits `other`.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { For, Show } from '@fluixi/core';
import { signal } from '@fluixi/reactive/signal';
import { Button } from '@fluixi-ui/button';
import type { ElementAction } from '../shared/element-action.js';
import { initials } from '../shared/initials.js';
import './account-select.css';

export interface AccountItem {
  id: string;
  email: string;
  name: string;
  picture?: string | null;
}

export interface AccountSelectLabels {
  other: string;
  signedIn: string;
  /** The subtitle with an app: {app} is its name. */
  continueTo: string;
  /** The note under the list with an app. */
  sees: string;
}

export const accountSelectLabels: AccountSelectLabels = {
  other: 'Use another account',
  signedIn: 'Signed in',
  continueTo: 'to continue to {app}',
  sees: '{app} sees the account you choose, and only what you allow.',
};

export interface AccountSelectEvents {
  select: { id: string; result: unknown };
  other: Record<string, never>;
}

const props = {
  accounts: prop.object<AccountItem[]>([]),
  action: prop.any<ElementAction<{ id: string }> | undefined>(undefined),
  labels: prop.object<Partial<AccountSelectLabels>>({}),
};

// Each avatar takes a tone in turn, so two accounts of one person still look apart.
const TONES = ['accent', 'ok', 'info', 'warn'];

export class IdpAccountSelect extends typedElement(props) {
  protected override render(): unknown {
    const label = () => ({ ...accountSelectLabels, ...this.labels });
    const busy = signal<string | null>(null);

    const choose = async (id: string) => {
      busy.set(id);
      try {
        const result = await this.action?.({ id });
        this.emit('select', { id, result });
      } catch {
        // The host reports its own failure; the list stays as it was.
      } finally {
        busy.set(null);
      }
    };

    return (
      <ul class="idp-accounts">
        <For each={this.accounts}>
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
          <Button variant="ghost" tone="neutral" class="idp-account" disabled={busy() !== null} onPress={() => this.emit('other', {})}>
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
  }
}

defineCustomElement('idp-account-select', IdpAccountSelect);

declare global {
  interface HTMLElementTagNameMap {
    'idp-account-select': IdpAccountSelect;
  }
  interface JSXCustomElements {
    'idp-account-select': ElementAttributes<typeof props, AccountSelectEvents>;
  }
}
