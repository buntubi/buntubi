/**
 * The portal's navigation: brand, the organization or app being worked on, search, and grouped
 * links. Folds into an icon rail: the host keeps the choice it gets with `toggle` and passes it
 * back as `collapsed`.
 */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { useView } from '../view.js';
import { sidebarLabels, type SidebarContext, type SidebarEvents, type SidebarGroup, type SidebarLogic } from './logic.js';
import { SidebarView } from './view.js';

const props = {
  brand: prop.object<{ name: string; mark: string; href: string }>({ name: '', mark: '', href: '/' }),
  context: prop.object<SidebarContext | null>(null),
  groups: prop.object<SidebarGroup[]>([]),
  collapsed: prop.boolean(false),
  /** Show the search button; the host answers its `search` event. */
  searchable: prop.boolean(false),
  labels: prop.object<Partial<typeof sidebarLabels>>({}),
};

export class IdpSidebar extends typedElement(props) {
  protected override render(): unknown {
    const logic: SidebarLogic = {
      brand: () => this.brand,
      context: () => this.context,
      groups: () => this.groups,
      labels: () => ({ ...sidebarLabels, ...this.labels }),
      collapsed: () => this.collapsed,
      toggle: () => this.emit('toggle', { collapsed: !this.collapsed }),
      searchable: () => this.searchable,
      search: () => this.emit('search', {}),
      switchTo: (key, href) => this.emit('switch', { key, href }),
    };
    return useView(SidebarView)(logic);
  }
}

defineCustomElement('idp-sidebar', IdpSidebar);

declare global {
  interface HTMLElementTagNameMap {
    'idp-sidebar': IdpSidebar;
  }
  interface JSXCustomElements {
    'idp-sidebar': ElementAttributes<typeof props, SidebarEvents>;
  }
}
