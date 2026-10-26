/** One provider's button: what any view of it draws from. */
export interface SocialButtonLogic {
  /** The provider's id: `google`, `github`. */
  provider: () => string;
  /** The text on the button, already worded for the page. */
  label: () => string;
  /** The provider's mark as SVG path data in a 24 by 24 box, or null for none. */
  icon: () => SocialIcon | null;
  /** Where the button leads: the provider's sign-in, a full page load. */
  href: () => string;
  go: () => void;
}

export interface SocialIcon {
  viewBox: string;
  paths: { d: string; fill?: string }[];
}
