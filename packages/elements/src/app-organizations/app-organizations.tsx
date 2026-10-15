/** Whether an app's tokens name an organization: never, when the request asks, or always. Saved through `Developer`. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/di';
import { Developer } from '@buntubi/sdk/developer';
import type { App, OrganizationUsage } from '@buntubi/sdk/types';
import { freshest } from '../fresh.js';
import { useView } from '../view.js';
import { appOrganizationsLabels, type AppOrganizationsLabels, type AppOrganizationsLogic } from './logic.js';
import { AppOrganizationsView } from './view.js';

const props = {
  app: prop.object<App | null>(null),
  canEdit: prop.boolean(false),
  labels: prop.object<Partial<AppOrganizationsLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpAppOrganizations extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const labels = () => ({ ...appOrganizationsLabels, ...this.labels });
    const app = freshest(() => this.app);
    const busy = signal(false);
    const saved = signal(false);
    const error = signal<string | null>(null);

    const logic: AppOrganizationsLogic = {
      labels,
      usage: () => app.current()?.organization_usage ?? 'none',
      canEdit: () => this.canEdit,
      choose: (usage: OrganizationUsage) => {
        const current = app.current();
        if (!current || usage === current.organization_usage) return;
        busy.set(true);
        error.set(null);
        saved.set(false);
        developer
          .updateApp({ client_id: current.client_id, patch: { organization_usage: usage } })
          .then(
            (answer) => {
              app.adopt(answer);
              saved.set(true);
            },
            (failure: unknown) => error.set(this.describe?.(failure) ?? labels().error),
          )
          .finally(() => busy.set(false));
      },
      busy,
      saved,
      error,
    };
    return useView(AppOrganizationsView)(logic);
  }
}

defineCustomElement('idp-app-organizations', IdpAppOrganizations);

declare global {
  interface HTMLElementTagNameMap {
    'idp-app-organizations': IdpAppOrganizations;
  }
  interface JSXCustomElements {
    'idp-app-organizations': ElementAttributes<typeof props>;
  }
}
