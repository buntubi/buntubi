/** One area of the account, as a card leading to its page; apart from the look. */

export interface AccountAreaLogic {
  title: () => string;
  note: () => string;
  link: () => string;
  href: () => string;
  /** An SVG path drawn in the card's mark. */
  icon: () => string;
}
