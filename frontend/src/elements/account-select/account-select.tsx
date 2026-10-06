/**
 * The accounts signed in on this browser. Choosing one emits `select` after the host's `action`
 * resolves; "another account" emits `other`.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { For } from '@fluixi/core';
import { signal } from '@fluixi/reactive/signal';
import { Button } from '@fluixi-ui/button';
import { Avatar, AvatarFallback } from '@fluixi-ui/avatar';
import type { ElementAction } from '../shared/element-action.js';
import { initials } from '../shared/initials.js';
import './account-select.css';

export interface AccountItem {
  id: string;
  email: string;
  name: string;
}

export interface AccountSelectLabels {
  other: string;
}

export const accountSelectLabels: AccountSelectLabels = { other: 'Use another account' };

export interface AccountSelectEvents {
  select: { id: string; result: unknown };
  other: Record<string, never>;
}

const props = {
  accounts: prop.object<AccountItem[]>([]),
  action: prop.any<ElementAction<{ id: string }> | undefined>(undefined),
  labels: prop.object<AccountSelectLabels>(accountSelectLabels),
};

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
      <div class="idp-accounts" role="list">
        <For each={this.accounts}>
          {(account) => (
            <div role="listitem">
              <Button
                variant="ghost"
                class="idp-account"
                aria-busy={() => (busy() === account.id ? 'true' : 'false')}
                disabled={busy() !== null}
                onPress={() => choose(account.id)}
              >
                <Avatar class="idp-account-avatar" aria-hidden="true">
                  <AvatarFallback>{initials(account.name || account.email)}</AvatarFallback>
                </Avatar>
                <span class="idp-account-text">
                  {account.name ? <span class="idp-account-name">{account.name}</span> : null}
                  <span class="idp-account-email">{account.email}</span>
                </span>
              </Button>
            </div>
          )}
        </For>
        <div role="listitem">
          <Button variant="ghost" class="idp-account" disabled={busy() !== null} onPress={() => this.emit('other', {})}>
            <Avatar class="idp-account-avatar" aria-hidden="true">
              <AvatarFallback>+</AvatarFallback>
            </Avatar>
            <span class="idp-account-text">
              <span class="idp-account-name">{() => label().other}</span>
            </span>
          </Button>
        </div>
      </div>
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
