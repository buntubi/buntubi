/**
 * What an application asks to see, and the user's answer. The host gives the application, the
 * signed-in user and the requested scopes already worded; `action` receives the answer.
 */
import { useView } from '@buntubi/sdk/view';
import { ConsentView } from './view.js';
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { useElementAction, type ElementAction } from '../shared/element-action.js';
import { messageReader, type Messages } from '../shared/messages.js';
import '../shared/form.css';
import './consent.css';

export interface ConsentScope {
  id: string;
  text: string;
}

export interface ConsentLink {
  label: string;
  href: string;
}

export interface ConsentDecision {
  approve: boolean;
}

export interface ConsentLabels {
  wants: string;
  signedInAs: string;
  approve: string;
  deny: string;
  pending: string;
}

export const consentLabels: ConsentLabels = {
  wants: 'would like to:',
  signedInAs: 'Signed in as',
  approve: 'Allow',
  deny: 'Cancel',
  pending: 'One moment',
};

export interface ConsentEvents {
  decide: ConsentDecision;
  success: { approve: boolean; result: unknown };
}

const props = {
  clientName: prop.string(''),
  clientLogo: prop.string(''),
  userEmail: prop.string(''),
  /** Shown above the scopes when set: an app not yet reviewed, in the host's words. */
  warning: prop.string(''),
  /** The app's policies, shown under the scopes. */
  links: prop.object<ConsentLink[]>([]),
  scopes: prop.object<ConsentScope[]>([]),
  action: prop.any<ElementAction<ConsentDecision> | undefined>(undefined),
  labels: prop.object<ConsentLabels>(consentLabels),
  messages: prop.object<Messages>({}),
};

export class IdpConsent extends typedElement(props) {
  /** What the view draws from; a deployment can give its own view (UI plugin `views`). */
  logic() {
    const label = () => ({ ...consentLabels, ...this.labels });
    const text = messageReader(() => this.messages);
    const answering = signal<boolean | null>(null);
    const { run, pending, error } = useElementAction('idp-consent', () => this.action, text);

    const decide = (approve: boolean) => {
      answering.set(approve);
      this.emit('decide', { approve });
      if (!this.action) return;
      run({ approve }).then(
        (result) => this.emit('success', { approve, result }),
        () => answering.set(null),
      );
    };

    return {
      answering,
      decide,
      error,
      label,
      pending,
      clientLogo: () => this.clientLogo,
      clientName: () => this.clientName,
      links: () => this.links,
      scopes: () => this.scopes,
      userEmail: () => this.userEmail,
      warning: () => this.warning,
    };
  }

  protected override render(): unknown {
    return useView(ConsentView)(this.logic());
  }
}

export type ConsentLogic = ReturnType<IdpConsent['logic']>;

defineCustomElement('idp-consent', IdpConsent);

declare global {
  interface HTMLElementTagNameMap {
    'idp-consent': IdpConsent;
  }
  interface JSXCustomElements {
    'idp-consent': ElementAttributes<typeof props, ConsentEvents>;
  }
}
