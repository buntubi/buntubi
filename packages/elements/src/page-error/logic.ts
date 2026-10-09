/** A page that could not be shown, apart from how it looks. */

export interface PageErrorLabels {
  title: string;
  retry: string;
}

export const pageErrorLabels: PageErrorLabels = {
  title: 'This page could not be shown',
  retry: 'Try again',
};

export interface PageErrorLogic {
  labels: () => PageErrorLabels;
  message: () => string;
  retry: () => void;
}

export interface PageErrorEvents {
  /** The reader asked to try again; the host loads the page afresh. */
  retry: Record<string, never>;
}
