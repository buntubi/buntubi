/** The platform's apps the person can open, one tile each. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import type { AppLauncherLogic } from './logic.js';
import { AppLauncherView } from './view.js';
import type { LaunchApp } from './logic.js';

const props = {
  apps: prop.object<LaunchApp[]>([]),
  title: prop.string('Your apps'),
};

export class IdpAppLauncher extends typedElement(props) {
  protected override render(): unknown {
    const logic: AppLauncherLogic = {
      title: () => this.title,
      apps: () => this.apps.filter((app) => !!app.url),
      initial: (app) => (app.name.trim()[0] ?? '?').toUpperCase(),
    };
    return useView(AppLauncherView)(logic);
  }
}

defineCustomElement('idp-app-launcher', IdpAppLauncher);

declare global {
  interface HTMLElementTagNameMap {
    'idp-app-launcher': IdpAppLauncher;
  }
  interface JSXCustomElements {
    'idp-app-launcher': ElementAttributes<typeof props>;
  }
}
