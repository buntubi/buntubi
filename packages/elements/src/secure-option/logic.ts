/** One way to protect the account, offered after signing up; apart from the look. */

export interface SecureOptionLogic {
  title: () => string;
  text: () => string;
  /** An SVG path, drawn in a 24 box. */
  icon: () => string;
  /** Shown as a pill beside the title, when set. */
  badge: () => string;
  action: () => string;
  busy: () => boolean;
  choose: () => void;
}

export interface SecureOptionEvents {
  choose: Record<string, never>;
}
