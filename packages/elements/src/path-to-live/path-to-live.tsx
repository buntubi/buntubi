/** An app's eight steps to live, the one it is on marked. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import type { AppOverview } from '@idp/sdk/types';
import { useView } from '../view.js';
import { pathToLiveLabels, stepsOf, type PathToLiveLabels, type PathToLiveLogic } from './logic.js';
import { PathToLiveView } from './view.js';

const props = {
  overview: prop.object<AppOverview | null>(null),
  labels: prop.object<Partial<PathToLiveLabels>>({}),
};

export class IdpPathToLive extends typedElement(props) {
  protected override render(): unknown {
    const labels = () => ({ ...pathToLiveLabels, ...this.labels });
    const steps = () => (this.overview ? stepsOf(this.overview) : []);
    const logic: PathToLiveLogic = {
      labels,
      steps,
      position: () => {
        const at = steps().findIndex((step) => step.state !== 'done');
        const n = at === -1 ? steps().length : at + 1;
        return labels().stepOf.replace('{n}', String(n)).replace('{total}', String(steps().length));
      },
    };
    return useView(PathToLiveView)(logic);
  }
}

defineCustomElement('idp-path-to-live', IdpPathToLive);

declare global {
  interface HTMLElementTagNameMap {
    'idp-path-to-live': IdpPathToLive;
  }
  interface JSXCustomElements {
    'idp-path-to-live': ElementAttributes<typeof props>;
  }
}
