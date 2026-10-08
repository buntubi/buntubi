/** Element words, built from the catalogue in one place so a language change reaches them all. */
import type { AppListLabels } from '@idp/elements/app-list/logic';
import type { AppSettingsLabels } from '@idp/elements/app-settings/logic';
import type { CredentialsLabels } from '@idp/elements/credentials/logic';
import type { LaunchPathLabels } from '@idp/elements/launch-path/logic';
import type { PermissionsLabels } from '@idp/elements/permissions/logic';
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

export const launchPathLabels = (): LaunchPathLabels => ({
  path: t('lp.path'),
  stepOf: t('lp.stepOf'),
  checklist: t('lp.checklist'),
  steps: {
    create: t('lp.step.create'),
    configure: t('lp.step.configure'),
    apis: t('lp.step.apis'),
    scopes: t('lp.step.scopes'),
    verify: t('lp.step.verify'),
    submit: t('lp.step.submit'),
    approved: t('lp.step.approved'),
    live: t('lp.step.live'),
  },
  checks: {
    basic_info: t('lp.check.basic_info'),
    redirect_uri: t('lp.check.redirect_uri'),
    products: t('lp.check.products'),
    policies: t('lp.check.policies'),
    support_email: t('lp.check.support_email'),
    permissions: t('lp.check.permissions'),
    review: t('lp.check.review'),
  },
  fields: {
    name: t('lp.field.name'),
    description: t('lp.field.description'),
    homepage_url: t('lp.field.homepage_url'),
    privacy_url: t('lp.field.privacy_url'),
    terms_url: t('lp.field.terms_url'),
    logo: t('lp.field.logo'),
    support_email: t('lp.field.support_email'),
  },
  required: t('lp.required'),
  fix: t('lp.fix'),
  goLive: t('lp.goLive'),
  submit: t('lp.submit'),
  live: t('lp.live'),
  inReview: t('lp.inReview'),
  missing: t('lp.missing'),
  error: t('error.generic'),
});

export const credentialsLabels = (): CredentialsLabels => ({
  title: t('appws.credentialsTitle'),
  intro: { sandbox: t('cr.introSandbox'), live: t('cr.introLive') },
  environments: { sandbox: t('apps.sandbox'), live: t('apps.production') },
  client: t('cr.client'),
  clientId: t('cr.clientId'),
  copy: t('common.copy'),
  copied: t('common.copied'),
  publicClient: t('cr.publicClient'),
  secret: t('cr.secret'),
  created: t('cr.created'),
  lastUsed: t('cr.lastUsed'),
  expires: t('cr.expires'),
  never: t('cr.never'),
  rotate: t('cr.rotate'),
  revoke: t('common.revoke'),
  revoked: t('cr.revoked'),
  secretOnce: t('app.secretOnce'),
  rotationNote: t('cr.rotationNote'),
  noSecret: t('cr.noSecret'),
  redirects: t('cr.redirects'),
  redirectsHint: t('cr.redirectsHint'),
  addRedirect: t('common.add'),
  remove: t('common.remove'),
  save: t('common.save'),
  invalidUri: t('cr.invalidUri'),
  keys: t('cr.keys'),
  keysHint: t('cr.keysHint'),
  noKeys: t('cr.noKeys'),
  keyName: t('cr.keyName'),
  keyScopes: t('cr.keyScopes'),
  createKey: t('cr.createKey'),
  keyOnce: t('app.keyOnce'),
  signing: t('cr.signing'),
  signingText: t('cr.signingText'),
  error: t('error.generic'),
});

export const permissionsLabels = (): PermissionsLabels => ({
  intro: t('pm.intro'),
  states: {
    live: t('pm.state.live'),
    waiting: t('pm.state.waiting'),
    sandbox: t('pm.state.sandbox'),
    added: t('pm.state.added'),
    available: t('pm.state.available'),
    restricted: t('pm.state.restricted'),
  },
  sensitive: t('pm.sensitive'),
  summaryTitle: t('pm.summaryTitle'),
  summary: t('pm.summary'),
  reviewNote: t('pm.reviewNote'),
  sandboxNote: t('pm.sandboxNote'),
  save: t('pm.save'),
  saved: t('pm.saved'),
  toReview: t('pm.toReview'),
  empty: t('pm.empty'),
  error: t('error.generic'),
});

export const appSettingsLabels = (): AppSettingsLabels => ({
  title: t('appws.basicInfoTitle'),
  intro: t('st.intro'),
  fields: {
    name: t('st.name'),
    description: t('st.description'),
    homepage_url: t('st.homepage'),
    privacy_url: t('st.privacy'),
    terms_url: t('st.terms'),
    logo: t('st.logo'),
  },
  hints: { description: t('st.descriptionHint'), logo: t('st.logoHint') },
  save: t('common.save'),
  saved: t('st.saved'),
  nameRequired: t('st.nameRequired'),
  error: t('error.generic'),
});
