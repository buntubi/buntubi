/** One app's sign-in settings: providers among the deployment's, and sign-up. Saved through `Developer`. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/di';
import { Developer, type AppPatch } from '@buntubi/sdk/developer';
import type { App } from '@buntubi/sdk/types';
import { freshest } from '../fresh.js';
import { useView } from '../view.js';
import { appSignInLabels, type AppSignInLabels, type AppSignInLogic } from './logic.js';
import { AppSignInView } from './view.js';

const props = {
  app: prop.object<App | null>(null),
  canEdit: prop.boolean(false),
  labels: prop.object<Partial<AppSignInLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpAppSignIn extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const labels = () => ({ ...appSignInLabels, ...this.labels });
    const app = freshest(() => this.app);
    const busy = signal(false);
    const saved = signal(false);
    const error = signal<string | null>(null);
    const offered = () => app.current()?.social_offered ?? [];
    const offers = (id: string) => {
      const chosen = app.current()?.social_providers;
      return chosen == null || chosen.includes(id);
    };
    const save = (patch: AppPatch) => {
      const current = app.current();
      if (!current) return;
      busy.set(true);
      error.set(null);
      saved.set(false);
      developer
        .updateApp({ client_id: current.client_id, patch })
        .then(
          (answer) => {
            app.adopt(answer);
            saved.set(true);
          },
          (failure: unknown) => error.set(this.describe?.(failure) ?? labels().error),
        )
        .finally(() => busy.set(false));
    };
    const logic: AppSignInLogic = {
      labels,
      offered,
      offers,
      setOffers: (id, on) => {
        const next = offered()
          .map((p) => p.id)
          .filter((pid) => (pid === id ? on : offers(pid)));
        // Every provider offered again: back to following the deployment's list.
        save({ social_providers: next.length === offered().length ? null : next });
      },
      signupOpen: () => app.current()?.signup_open ?? true,
      setSignupOpen: (on) => save({ signup_open: on }),
      canEdit: () => this.canEdit,
      busy,
      saved,
      error,
    };
    return useView(AppSignInView)(logic);
  }
}

defineCustomElement('idp-app-sign-in', IdpAppSignIn);

declare global {
  interface HTMLElementTagNameMap {
    'idp-app-sign-in': IdpAppSignIn;
  }
  interface JSXCustomElements {
    'idp-app-sign-in': ElementAttributes<typeof props>;
  }
}
