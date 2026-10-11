/** The data copy card; apart from the look. */
export interface DataExportLabels {
  title: string;
  about: string;
  download: string;
  working: string;
  /** {date} of the last copy. */
  last: string;
  never: string;
  error: string;
}

export const dataExportLabels: DataExportLabels = {
  title: 'Download your data',
  about: 'A file with your profile, passkeys, devices, connected apps, organizations and the activity of your account, in JSON.',
  download: 'Download my data',
  working: 'Preparing the file',
  last: 'Last copy: {date}',
  never: 'Last copy: none yet',
  error: 'Something went wrong. Try again.',
};

export interface DataExportLogic {
  labels: () => DataExportLabels;
  last: () => string;
  download: () => Promise<void>;
  busy: () => boolean;
  error: () => string | null;
}
