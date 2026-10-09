/** A search field over a list; apart from the look. */

export interface SearchBoxLogic {
  label: () => string;
  query: () => string;
  /** Typing: the search is reported once the typing pauses. */
  edit: (value: string) => void;
  /** Enter: reported at once. */
  submit: () => void;
}

export interface SearchBoxEvents {
  /** The host decides what searching means, usually the address. */
  search: { q: string };
}
