/**
 * The accounts signed in on this browser. Choosing one emits `select` after the host's `action`
 * resolves; "another account" emits `other`.
 */
import { useView } from '@buntu/sdk/view';
import { AccountSelectView } from './view.js';
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import type { ElementAction } from '../shared/element-action.js';
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
export const TONES = ['accent', 'ok', 'info', 'warn'];

export class IdpAccountSelect extends typedElement(props) {
  /** What the view draws from; a deployment can give its own view (UI plugin `views`). */
  logic() {
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

    return {
      busy,
      choose,
      label,
      accounts: () => this.accounts,
      other: () => this.emit('other', {}),
    };
  }

  protected override render(): unknown {
    return useView(AccountSelectView)(this.logic());
  }
}

export type AccountSelectLogic = ReturnType<IdpAccountSelect['logic']>;

defineCustomElement('idp-account-select', IdpAccountSelect);

declare global {
  interface HTMLElementTagNameMap {
    'idp-account-select': IdpAccountSelect;
  }
  interface JSXCustomElements {
    'idp-account-select': ElementAttributes<typeof props, AccountSelectEvents>;
  }
}
