/** How ready an app is for review: a percentage and the items; apart from the look. */

export interface ReadinessLabels {
  ready: string;
  /** "{n} items left". */
  left: string;
  submit: string;
  note: string;
}

export const readinessLabels: ReadinessLabels = {
  ready: 'Ready for review',
  left: '{n} items left',
  submit: 'Submit for review',
  note: 'Opens once every required item is in place.',
};

export interface ReadinessItem {
  key: string;
  label: string;
  done: boolean;
  href: string;
}

export interface ReadinessLogic {
  labels: () => ReadinessLabels;
  percent: () => number;
  left: () => number;
  items: () => ReadinessItem[];
  canSubmit: () => boolean;
  submitHref: () => string;
}
