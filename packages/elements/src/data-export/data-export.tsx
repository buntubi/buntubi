/** The data copy card: saves the account as JSON through the injected `Account` service. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { signal } from '@fluixi/reactive/signal';
import { inject } from '@fluixi/start/di';
import { Account } from '@idp/sdk/account';
import { shortDate } from '../dates.js';
import { useView } from '../view.js';
import { dataExportLabels, type DataExportLabels, type DataExportLogic } from './logic.js';
import { DataExportView } from './view.js';

const props = {
  /** ISO, the last copy taken; empty when none. */
  lastExportAt: prop.string(''),
  locale: prop.string('en'),
  labels: prop.object<Partial<DataExportLabels>>({}),
  describe: prop.any<((error: unknown) => string) | undefined>(undefined),
};

export class IdpDataExport extends typedElement(props) {
  protected override render(): unknown {
    const account = inject(Account);
    const labels = () => ({ ...dataExportLabels, ...this.labels });
    const busy = signal(false);
    const error = signal<string | null>(null);
    const logic: DataExportLogic = {
      labels,
      last: () => (this.lastExportAt ? labels().last.replace('{date}', shortDate(this.lastExportAt, this.locale)) : labels().never),
      download: async () => {
        busy.set(true);
        error.set(null);
        try {
          await account.downloadData();
        } catch (failure) {
          error.set(this.describe?.(failure) ?? labels().error);
        } finally {
          busy.set(false);
        }
      },
      busy,
      error,
    };
    return useView(DataExportView)(logic);
  }
}

defineCustomElement('idp-data-export', IdpDataExport);

declare global {
  interface HTMLElementTagNameMap {
    'idp-data-export': IdpDataExport;
  }
  interface JSXCustomElements {
    'idp-data-export': ElementAttributes<typeof props>;
  }
}
