/** A developer's apps, filtered by where they stand: live, in review, changes requested, draft. */
import { defineCustomElement, prop, typedElement, type ElementAttributes } from '@fluixi/web-components';
import { memo, signal } from '@fluixi/reactive/signal';
import { useView } from '../view.js';
import '../app-row/app-row.js';
import '../segmented/segmented.js';
import { appListLabels, statusOf, type AppFilter, type AppListLabels, type AppListLogic, type AppRow, type AppStatus } from './logic.js';
import { AppListView } from './view.js';

const FILTERS: AppFilter[] = ['all', 'live', 'in_review', 'draft'];

const matches = (filter: AppFilter, status: AppStatus) =>
  filter === 'all' || status === filter || (filter === 'in_review' && status === 'changes_requested');

const props = {
  apps: prop.object<AppRow[]>([]),
  labels: prop.object<Partial<AppListLabels>>({}),
};

export class IdpAppList extends typedElement(props) {
  protected override render(): unknown {
    const filter = signal<AppFilter>('all');
    const rows = memo(() => this.apps.map((app) => ({ ...app, status: statusOf(app) })));
    const labels = () => ({ ...appListLabels, ...this.labels });
    const logic: AppListLogic = {
      labels,
      filter,
      filters: () => FILTERS.map((value) => ({ value, label: labels().filters[value] })),
      choose: (value) => filter.set(value as AppFilter),
      rows: () => rows().filter((row) => matches(filter(), row.status)),
    };
    return useView(AppListView)(logic);
  }
}

defineCustomElement('idp-app-list', IdpAppList);

declare global {
  interface HTMLElementTagNameMap {
    'idp-app-list': IdpAppList;
  }
  interface JSXCustomElements {
    'idp-app-list': ElementAttributes<typeof props>;
  }
}
