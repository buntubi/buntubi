/** One kind of app to choose, as a card; apart from the look. */

export interface KindCardLogic {
  title: () => string;
  text: () => string;
  /** An SVG path, drawn in a 24 box. */
  icon: () => string;
  selected: () => boolean;
  choose: () => void;
}

export interface KindCardEvents {
  choose: Record<string, never>;
}
