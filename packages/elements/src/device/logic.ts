/** One signed-in browser or phone; apart from the look. */
export interface DeviceLabels {
  /** {browser} on {system}. */
  name: string;
  unknown: string;
  here: string;
  activeNow: string;
  /** {date} it was last seen. */
  lastSeen: string;
  /** {method} it signed in with. */
  signedInWith: string;
  methods: { passkey: string; twoStep: string; backup: string; password: string };
  /** {ip} it was last seen from. */
  network: string;
  signOut: string;
  error: string;
}

export const deviceLabels: DeviceLabels = {
  name: '{browser} on {system}',
  unknown: 'Unknown browser',
  here: 'This device',
  activeNow: 'Active now',
  lastSeen: 'Last seen {date}',
  signedInWith: 'signed in with {method}',
  methods: { passkey: 'a passkey', twoStep: 'password and two-step', backup: 'password and a backup code', password: 'password' },
  network: 'Network address {ip}',
  signOut: 'Sign out',
  error: 'Something went wrong. Try again.',
};

export interface DeviceLogic {
  labels: () => DeviceLabels;
  name: () => string;
  phone: () => boolean;
  here: () => boolean;
  network: () => string;
  seen: () => string;
  signOut: () => Promise<void>;
  busy: () => boolean;
  error: () => string | null;
}
