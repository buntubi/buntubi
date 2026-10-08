/** The platform's own apps the signed-in person can open, from their account page. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { For, Show } from '@fluixi/core';
import { Avatar, AvatarFallback, AvatarImage } from '@fluixi-ui/avatar';
import { initials } from '../shared/initials.js';
import './app-links.css';

export interface AppLink {
  name: string;
  url: string;
  logo?: string | null;
}

export interface AppLinksLabels {
  /** Read by screen readers before each link: "Open". */
  open: string;
}

export const appLinksLabels: AppLinksLabels = { open: 'Open' };

const props = {
  apps: prop.object<AppLink[]>([]),
  labels: prop.object<AppLinksLabels>(appLinksLabels),
};

export class IdpAppLinks extends typedElement(props) {
  protected override render(): unknown {
    const label = () => ({ ...appLinksLabels, ...this.labels });
    return (
      <ul class="idp-apps">
        <For each={this.apps}>
          {(app) => (
            <li>
              <a class="idp-app" href={app.url} aria-label={() => `${label().open} ${app.name}`}>
                <Avatar class="idp-app-mark" aria-hidden="true">
                  <Show when={app.logo}>{(logo: string) => <AvatarImage src={logo} alt="" />}</Show>
                  <AvatarFallback>{initials(app.name)}</AvatarFallback>
                </Avatar>
                <span class="idp-app-name">{app.name}</span>
                <svg class="idp-app-go" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </a>
            </li>
          )}
        </For>
      </ul>
    );
  }
}

defineCustomElement('idp-app-links', IdpAppLinks);

declare global {
  interface HTMLElementTagNameMap {
    'idp-app-links': IdpAppLinks;
  }
  interface JSXCustomElements {
    'idp-app-links': ElementAttributes<typeof props>;
  }
}
