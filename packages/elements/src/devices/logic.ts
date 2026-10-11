/** The devices page's list: a summary, signing out every other one, then a row each. */
import type { Device } from '@idp/sdk/account';
import type { DeviceLabels } from '../device/logic.js';

export interface DevicesLabels {
  title: string;
  /** {n} devices. */
  count: string;
  countOne: string;
  /** {n} not seen for more than 30 days. */
  inactive: string;
  signOutOthers: string;
  /** Under the list. */
  note: string;
  error: string;
  device: Partial<DeviceLabels>;
}

export const devicesLabels: DevicesLabels = {
  title: 'Devices',
  count: '{n} devices',
  countOne: '1 device',
  inactive: '{n} inactive for more than 30 days',
  signOutOthers: 'Sign out everywhere else',
  note: 'Addresses are the network’s and say little about where a device is.',
  error: 'Something went wrong. Try again.',
  device: {},
};

export interface DevicesLogic {
  labels: () => DevicesLabels;
  devices: () => Device[];
  summary: () => string;
  others: () => boolean;
  locale: () => string;
  describe: () => ((error: unknown) => string) | undefined;
  signOutOthers: () => Promise<void>;
  busy: () => boolean;
  error: () => string | null;
}
