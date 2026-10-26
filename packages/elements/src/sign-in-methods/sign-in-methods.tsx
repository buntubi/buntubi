/**
 * The sign-in methods card. Linking goes to the provider and back (a full page load); the page
 * passes what came back as `connected` or `refusal`. Unlinking goes through the injected
 * `Account` service.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/di';
import { Account, type LinkedIdentity } from '@buntubi/sdk/account';
import { shortDate } from '../dates.js';
import { useView } from '../view.js';
import { signInMethodsLabels, type SignInMethodsLabels, type SignInMethodsLogic } from './logic.js';
import { SignInMethodsView } from './view.js';

const props = {
  identities: prop.any<LinkedIdentity[]>([]),
  available: prop.any<{ id: string; label: string }[]>([]),
  /** The provider just linked, by name, when the page came back from it. */
  connected: prop.string(''),
  /** Why linking did not happen, already worded, when the page came back from the provider. */
  refusal: prop.string(''),
  locale: prop.string('en'),
  labels: prop.object<Partial<SignInMethodsLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpSignInMethods extends typedElement(props) {
  protected override render(): unknown {
    const account = inject(Account);
    const labels = () => ({ ...signInMethodsLabels, ...this.labels });
    const busy = signal(false);
    const notice = signal<string | null>(this.connected ? labels().connected.replace('{provider}', this.connected) : null);
    const error = signal<string | null>(this.refusal || null);
    const logic: SignInMethodsLogic = {
      labels,
      identities: () => this.identities ?? [],
      available: () =>
        (this.available ?? []).map((item) => ({
          provider: item.id,
          label: labels().connect.replace('{provider}', item.label),
          href: `/signin/${encodeURIComponent(item.id)}?connect=1`,
        })),
      dates: (identity) =>
        [
          labels().linkedOn.replace('{date}', shortDate(identity.created_at, this.locale)),
          identity.last_used_at ? labels().lastUsed.replace('{date}', shortDate(identity.last_used_at, this.locale)) : '',
        ]
          .filter(Boolean)
          .join(', '),
      remove: async (identity) => {
        busy.set(true);
        error.set(null);
        notice.set(null);
        try {
          await account.unlinkIdentity(identity.id);
          notice.set(labels().removed);
        } catch (failure) {
          const code = failure instanceof Error ? failure.message : '';
          error.set(code === 'last_way_in' ? labels().lastWayIn : (this.describe?.(failure) ?? labels().error));
        } finally {
          busy.set(false);
        }
      },
      busy,
      notice,
      error,
    };
    return useView(SignInMethodsView)(logic);
  }
}

defineCustomElement('idp-sign-in-methods', IdpSignInMethods);

declare global {
  interface HTMLElementTagNameMap {
    'idp-sign-in-methods': IdpSignInMethods;
  }
  interface JSXCustomElements {
    'idp-sign-in-methods': ElementAttributes<typeof props>;
  }
}
