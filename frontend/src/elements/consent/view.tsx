/** The default look of idp-consent. */
import { For, Show } from '@fluixi/core';
import { Button } from '@fluixi-ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@fluixi-ui/avatar';
import { initials } from '../shared/initials.js';
import { viewToken } from '@buntubi/sdk/view';
import type { ConsentLogic } from './consent.js';

export const consentView = ({ answering, decide, error, label, pending, clientLogo, clientName, links, organization, scopes, userEmail, warning }: ConsentLogic) =>
  (
      <div class="idp-form idp-consent">
        <div class="idp-consent-app">
          <Avatar class="idp-consent-logo" aria-hidden="true">
            {() => (clientLogo() ? <AvatarImage src={clientLogo()} alt="" /> : null)}
            <AvatarFallback>{() => initials(clientName())}</AvatarFallback>
          </Avatar>
          <p>
            <strong>{() => clientName()}</strong> {() => label().wants}
          </p>
        </div>
        {() => (warning() ? <p class="idp-consent-warning" role="note">{warning()}</p> : null)}
        <ul class="idp-consent-scopes">
          <For each={scopes()}>{(scope) => <li data-scope={scope.id}>{scope.text}</li>}</For>
        </ul>
        <Show when={organization()}>
          <p class="idp-note idp-consent-organization">{() => label().forOrganization.replace('{organization}', organization())}</p>
        </Show>
        <Show when={links().length}>
          <p class="idp-consent-links">
            <For each={links()}>
              {(link) => (
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              )}
            </For>
          </p>
        </Show>
        <p class="idp-note">
          {() => label().signedInAs} <strong>{() => userEmail()}</strong>
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

export const ConsentView = viewToken<ConsentLogic>('idp-consent', consentView);
