/** A search field and its button; apart from the look. */

export interface SearchBoxLogic {
  label: () => string;
  button: () => string;
  query: () => string;
  edit: (value: string) => void;
  submit: () => void;
}

export interface SearchBoxEvents {
  /** Submitted; the host decides what searching means, usually the address. */
  search: { q: string };
}
