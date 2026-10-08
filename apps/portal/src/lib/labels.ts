/** Element words, built from the catalogue in one place so a language change reaches them all. */
import type { AppListLabels } from '@idp/elements/app-list/logic';
import type { SidebarLabels } from '@idp/elements/sidebar/logic';
import { t } from './i18n.js';

export const sidebarLabels = (): SidebarLabels => ({
  product: t('shell.developers'),
  collapse: t('shell.collapse'),
  expand: t('shell.expand'),
  search: t('shell.search'),
  navigation: t('shell.navigation'),
});

export const appListLabels = (): AppListLabels => ({
  title: t('apps.title'),
  app: t('apps.app'),
  status: t('apps.status'),
  apis: t('apps.apis'),
  empty: t('apps.empty'),
  filters: {
    all: t('apps.all'),
    live: t('apps.live'),
    in_review: t('apps.inReview'),
    changes_requested: t('apps.changes'),
    draft: t('apps.draft'),
  },
  statuses: { live: t('apps.live'), in_review: t('apps.inReview'), changes_requested: t('apps.changes'), draft: t('apps.draft') },
  environments: { sandbox: t('apps.sandbox'), live: t('apps.production') },
});
