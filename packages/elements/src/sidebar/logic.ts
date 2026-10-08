/** The sidebar's data, words and behaviour, apart from how it looks. */

export interface SidebarItem {
  label: string;
  href: string;
  /** An SVG path in a 24 by 24 box, drawn with a stroke. */
  icon: string;
  current?: boolean;
  /** A small count next to the label, such as reviews waiting. */
  count?: number;
}

export interface SidebarGroup {
  /** Empty for a group without a heading. */
  label: string;
  items: SidebarItem[];
}

/** What sits above the navigation: the organization, or the app being worked on. */
export interface SidebarContext {
  name: string;
  detail: string;
  /** One letter or two. */
  mark: string;
  /** A link above it, such as back to all apps. */
  back?: { label: string; href: string };
}

export interface SidebarLabels {
  /** What follows the brand's name: "Developers". */
  product: string;
  collapse: string;
  expand: string;
  search: string;
  navigation: string;
}

export const sidebarLabels: SidebarLabels = {
  product: 'Developers',
  collapse: 'Collapse sidebar',
  expand: 'Expand sidebar',
  search: 'Search',
  navigation: 'Navigation',
};

export interface SidebarEvents {
  /** The sidebar was folded or opened; the host keeps the choice. */
  toggle: { collapsed: boolean };
  /** The search was asked for. */
  search: Record<string, never>;
}

export interface SidebarLogic {
  brand: () => { name: string; mark: string; href: string };
  context: () => SidebarContext | null;
  groups: () => SidebarGroup[];
  labels: () => SidebarLabels;
  collapsed: () => boolean;
  toggle: () => void;
  /** Whether the host offers search; the button is shown only then. */
  searchable: () => boolean;
  search: () => void;
}
