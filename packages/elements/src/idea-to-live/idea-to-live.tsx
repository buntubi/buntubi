/** The way from an idea to production, for a newcomer reading the home page. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import { ideaToLiveLabels, type IdeaToLiveLabels, type IdeaToLiveLogic } from './logic.js';
import { IdeaToLiveView } from './view.js';

const props = {
  labels: prop.object<Partial<IdeaToLiveLabels>>({}),
};

export class IdpIdeaToLive extends typedElement(props) {
  protected override render(): unknown {
    const logic: IdeaToLiveLogic = { labels: () => ({ ...ideaToLiveLabels, ...this.labels }) };
    return useView(IdeaToLiveView)(logic);
  }
}

defineCustomElement('idp-idea-to-live', IdpIdeaToLive);

declare global {
  interface HTMLElementTagNameMap {
    'idp-idea-to-live': IdpIdeaToLive;
  }
  interface JSXCustomElements {
    'idp-idea-to-live': ElementAttributes<typeof props>;
  }
}
