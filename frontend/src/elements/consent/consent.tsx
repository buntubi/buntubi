/**
 * What an application asks to see, and the user's answer. The host gives the application, the
 * signed-in user and the requested scopes already worded; `action` receives the answer.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { For, Show } from '@fluixi/core';
import { signal } from '@fluixi/reactive/signal';
import { Button } from '@fluixi-ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@fluixi-ui/avatar';
import { useElementAction, type ElementAction } from '../shared/element-action.js';
import { messageReader, type Messages } from '../shared/messages.js';
import { initials } from '../shared/initials.js';
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
  protected override render(): unknown {
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

    return (
      <div class="idp-form idp-consent">
        <div class="idp-consent-app">
          <Avatar class="idp-consent-logo" aria-hidden="true">
            {() => (this.clientLogo ? <AvatarImage src={this.clientLogo} alt="" /> : null)}
            <AvatarFallback>{() => initials(this.clientName)}</AvatarFallback>
          </Avatar>
          <p>
            <strong>{() => this.clientName}</strong> {() => label().wants}
          </p>
        </div>
        {() => (this.warning ? <p class="idp-consent-warning" role="note">{this.warning}</p> : null)}
        <ul class="idp-consent-scopes">
          <For each={this.scopes}>{(scope) => <li data-scope={scope.id}>{scope.text}</li>}</For>
        </ul>
        <Show when={this.links.length}>
          <p class="idp-consent-links">
            <For each={this.links}>
              {(link) => (
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              )}
            </For>
          </p>
        </Show>
        <p class="idp-note">
          {() => label().signedInAs} <strong>{() => this.userEmail}</strong>
        </p>
        {() => (error() ? <p class="idp-alert" role="alert">{error()}</p> : null)}
        <div class="idp-actions">
          <Button type="button" variant="outline" disabled={pending()} onPress={() => decide(false)}>
            {() => (pending() && answering() === false ? label().pending : label().deny)}
          </Button>
          <Button type="button" variant="solid" disabled={pending()} onPress={() => decide(true)}>
            {() => (pending() && answering() === true ? label().pending : label().approve)}
          </Button>
        </div>
      </div>
    );
  }
}

defineCustomElement('idp-consent', IdpConsent);

declare global {
  interface HTMLElementTagNameMap {
    'idp-consent': IdpConsent;
  }
  interface JSXCustomElements {
    'idp-consent': ElementAttributes<typeof props, ConsentEvents>;
  }
}
