/** The kinds of app to choose from, one card each; apart from the look. */

export interface KindEntry {
  kind: string;
  title: string;
  text: string;
  icon: string;
}

export interface KindPickerLogic {
  title: () => string;
  intro: () => string;
  kinds: () => KindEntry[];
  selected: () => string;
  choose: (kind: string) => void;
}

export interface KindPickerEvents {
  choose: { kind: string };
}
