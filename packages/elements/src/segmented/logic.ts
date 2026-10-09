/** One choice among a few, shown side by side; apart from the look. */

export interface SegmentedOption {
  value: string;
  label: string;
  /** A small count after the label. */
  count?: number;
  /** A coloured dot before the label, as a CSS colour. */
  dot?: string;
}

export interface SegmentedLogic {
  label: () => string;
  options: () => SegmentedOption[];
  value: () => string;
  size: () => string;
  choose: (value: string) => void;
}

export interface SegmentedEvents {
  change: { value: string };
}
