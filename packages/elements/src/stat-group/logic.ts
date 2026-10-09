/** A row of counts, each one a stat card; apart from the look. */

export interface Stat {
  key: string;
  label: string;
  value: number;
  href?: string;
  attention?: boolean;
}

export interface StatGroupLogic {
  stats: () => Stat[];
}
