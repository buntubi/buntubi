/** Who is signed in, and what they can do from there; apart from the look. */

export interface UserMenuLabels {
  menu: string;
  language: string;
  signOut: string;
}

export const userMenuLabels: UserMenuLabels = {
  menu: 'Account',
  language: 'Français',
  signOut: 'Sign out',
};

export interface UserMenuLogic {
  labels: () => UserMenuLabels;
  name: () => string;
  detail: () => string;
  mark: () => string;
  compact: () => boolean;
  language: () => void;
  signOut: () => void;
}

export interface UserMenuEvents {
  /** The other language was asked for. */
  language: Record<string, never>;
  /** The host signs out: a full page load to its sign-out address. */
  signout: Record<string, never>;
}
