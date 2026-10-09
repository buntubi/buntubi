/** The signed-in person at the foot of the sidebar: name and role, and a menu for language and sign out. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import { userMenuLabels, type UserMenuEvents, type UserMenuLabels, type UserMenuLogic } from './logic.js';
import { UserMenuView } from './view.js';

const props = {
  name: prop.string(''),
  /** A second line: the role, or the email. */
  detail: prop.string(''),
  /** Only the mark, for the folded sidebar. */
  compact: prop.boolean(false),
  labels: prop.object<Partial<UserMenuLabels>>({}),
};

const initials = (name: string) =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('') || '?';

export class IdpUserMenu extends typedElement(props) {
  protected override render(): unknown {
    const logic: UserMenuLogic = {
      labels: () => ({ ...userMenuLabels, ...this.labels }),
      name: () => this.name,
      detail: () => this.detail,
      mark: () => initials(this.name),
      compact: () => this.compact,
      language: () => this.emit('language', {}),
      signOut: () => this.emit('signout', {}),
    };
    return useView(UserMenuView)(logic);
  }
}

defineCustomElement('idp-user-menu', IdpUserMenu);

declare global {
  interface HTMLElementTagNameMap {
    'idp-user-menu': IdpUserMenu;
  }
  interface JSXCustomElements {
    'idp-user-menu': ElementAttributes<typeof props, UserMenuEvents>;
  }
}
