/** The header's account menu: switch, add, sign out of one or all, through the injected `Account` service. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Account, type BrowserAccount } from '@idp/sdk/account';
import { initials } from '../initials.js';
import { useView } from '../view.js';
import {
  accountSwitcherLabels,
  type AccountSwitcherEvents,
  type AccountSwitcherLabels,
  type AccountSwitcherLogic,
} from './logic.js';
import { AccountSwitcherView } from './view.js';

const props = {
  accounts: prop.object<BrowserAccount[]>([]),
  /** Where signing in one more account starts. */
  addHref: prop.string('/signin'),
  labels: prop.object<Partial<AccountSwitcherLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpAccountSwitcher extends typedElement(props) {
  protected override render(): unknown {
    const account = inject(Account);
    const labels = () => ({ ...accountSwitcherLabels, ...this.labels });
    const busy = signal<string | null>(null);
    const error = signal<string | null>(null);
    const run = async (key: string, work: () => Promise<string>) => {
      busy.set(key);
      error.set(null);
      try {
        this.emit('leave', { href: await work() });
      } catch (failure) {
        error.set(this.describe?.(failure) ?? labels().error);
        busy.set(null);
      }
    };
    const logic: AccountSwitcherLogic = {
      labels,
      accounts: () => this.accounts,
      current: () => this.accounts.find((entry) => entry.current) ?? null,
      initials: (entry) => initials(entry.name || entry.email),
      addHref: () => this.addHref,
      switchTo: (id) => run(id, () => account.switchTo(id)),
      signOut: (id) => run(`out:${id}`, () => account.signOut(id)),
      signOutAll: () => run('all', () => account.signOutAll()),
      busy,
      error,
    };
    return useView(AccountSwitcherView)(logic);
  }
}

defineCustomElement('idp-account-switcher', IdpAccountSwitcher);

declare global {
  interface HTMLElementTagNameMap {
    'idp-account-switcher': IdpAccountSwitcher;
  }
  interface JSXCustomElements {
    'idp-account-switcher': ElementAttributes<typeof props, AccountSwitcherEvents>;
  }
}
