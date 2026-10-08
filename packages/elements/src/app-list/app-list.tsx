/** A developer's apps, filtered by where they stand: live, in review, changes requested, draft. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { memo, signal } from '@fluixi/reactive/signal';
import { useView } from '../view.js';
import { appListLabels, statusOf, type AppFilter, type AppListLabels, type AppListLogic, type AppRow } from './logic.js';
import { AppListView } from './view.js';

const FILTERS: AppFilter[] = ['all', 'live', 'in_review', 'changes_requested', 'draft'];

const props = {
  apps: prop.object<AppRow[]>([]),
  labels: prop.object<Partial<AppListLabels>>({}),
};

export class DpAppList extends typedElement(props) {
  protected override render(): unknown {
    const filter = signal<AppFilter>('all');
    const rows = memo(() => this.apps.map((app) => ({ ...app, status: statusOf(app) })));
    const logic: AppListLogic = {
      labels: () => ({ ...appListLabels, ...this.labels }),
      filters: () =>
        FILTERS.map((value) => ({
          value,
          count: value === 'all' ? rows().length : rows().filter((row) => row.status === value).length,
          current: filter() === value,
          choose: () => filter.set(value),
        })).filter((entry) => entry.value === 'all' || entry.count > 0),
      rows: () => (filter() === 'all' ? rows() : rows().filter((row) => row.status === filter())),
    };
    return useView(AppListView)(logic);
  }
}

defineCustomElement('dp-app-list', DpAppList);

declare global {
  interface HTMLElementTagNameMap {
    'dp-app-list': DpAppList;
  }
  interface JSXCustomElements {
    'dp-app-list': ElementAttributes<typeof props>;
  }
}
