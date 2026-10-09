/** A page's title, the line under it, and its actions; apart from the look. */

export interface PageAction {
  label: string;
  href: string;
  /** "solid" for the main action, "outline" for the others. */
  variant?: 'solid' | 'outline';
  /** An SVG path drawn before the label. */
  icon?: string;
}

export interface PageHeaderLogic {
  eyebrow: () => string;
  title: () => string;
  intro: () => string;
  actions: () => PageAction[];
}
