/** The developer terms and their acceptance, through the injected `Developer` service. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Developer } from '@buntu/sdk/developer';
import { useView } from '../view.js';
import { developerTermsLabels, type DeveloperTermsEvents, type DeveloperTermsLabels, type DeveloperTermsLogic } from './logic.js';
import { DeveloperTermsView } from './view.js';

const props = {
  labels: prop.object<Partial<DeveloperTermsLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpDeveloperTerms extends typedElement(props) {
  protected override render(): unknown {
    const developer = inject(Developer);
    const labels = () => ({ ...developerTermsLabels, ...this.labels });
    const busy = signal(false);
    const error = signal<string | null>(null);
    const logic: DeveloperTermsLogic = {
      labels,
      accept: async () => {
        busy.set(true);
        error.set(null);
        try {
          await developer.acceptTerms();
          this.emit('accepted', {});
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(false);
        }
      },
      busy,
      error,
    };
    return useView(DeveloperTermsView)(logic);
  }
}

defineCustomElement('idp-developer-terms', IdpDeveloperTerms);

declare global {
  interface HTMLElementTagNameMap {
    'idp-developer-terms': IdpDeveloperTerms;
  }
  interface JSXCustomElements {
    'idp-developer-terms': ElementAttributes<typeof props, DeveloperTermsEvents>;
  }
}
