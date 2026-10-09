/** Element words, built from the catalogue in one place so a language change reaches them all. */
import type { AppScopesLabels } from '@idp/elements/app-scopes/logic';
import type { DeveloperTermsLabels } from '@idp/elements/developer-terms/logic';
import type { OrganizationFormLabels } from '@idp/elements/organization-form/logic';
import type { WelcomeLabels } from '@idp/elements/welcome/logic';
import type { NotFoundLabels } from '@idp/elements/not-found/logic';
import type { PageErrorLabels } from '@idp/elements/page-error/logic';
import type { AppListLabels } from '@idp/elements/app-list/logic';
import type { AppReviewLabels } from '@idp/elements/app-review/logic';
import type { AppSettingsLabels } from '@idp/elements/app-settings/logic';
import type { CreateAppLabels } from '@idp/elements/create-app/logic';
import type { OrganizationSettingsLabels } from '@idp/elements/organization-settings/logic';
import type { ProductBrowserLabels } from '@idp/elements/product-browser/logic';
import type { TeamLabels } from '@idp/elements/team/logic';
import type { ShellLabels } from '@idp/shell/shell';
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

export const createAppLabels = (): CreateAppLabels => ({
  steps: { 1: t('ca.step1'), 2: t('ca.step2'), 3: t('ca.step3') },
  stepsLabel: t('ca.stepsLabel'),
  kindTitle: t('ca.kindTitle'),
  kindIntro: t('ca.kindIntro'),
  kinds: {
    consumer: { title: t('ca.kind.consumer'), text: t('ca.kind.consumerText') },
    business: { title: t('ca.kind.business'), text: t('ca.kind.businessText') },
    web: { title: t('ca.kind.web'), text: t('ca.kind.webText') },
    mobile: { title: t('ca.kind.mobile'), text: t('ca.kind.mobileText') },
    backend: { title: t('ca.kind.backend'), text: t('ca.kind.backendText') },
    internal: { title: t('ca.kind.internal'), text: t('ca.kind.internalText') },
  },
  info: {
    title: t('ca.infoTitle'),
    fields: {
      logo: t('ca.iconUrl'),
      name: t('st.name'),
      description: t('st.description'),
      homepage_url: t('ca.website'),
      category: t('ca.category'),
      privacy_url: t('ca.privacyUrl'),
      terms_url: t('ca.termsUrl'),
    },
    placeholders: {
      logo: 'https://',
      homepage_url: 'https://',
      category: t('ca.categoryPlaceholder'),
      privacy_url: 'https://',
      terms_url: 'https://',
    },
    logoHint: t('ca.iconHint'),
    platforms: t('ca.platforms'),
  },
  platformNames: { web: 'Web', ios: 'iOS', android: 'Android', backend: 'Backend' },
  preview: { title: t('ca.preview'), text: t('ca.previewText'), links: t('ca.previewLinks'), note: t('ca.previewNote') },
  productsTitle: t('ca.productsTitle'),
  productsIntro: t('ca.productsIntro'),
  approvals: { none: t('ca.approval.none'), review: t('ca.approval.review'), restricted: t('ca.approval.restricted') },
  availability: { ga: t('ca.availability.ga'), beta: t('ca.availability.beta'), sandbox: t('ca.availability.sandbox') },
  auth: { oauth2: 'OAuth 2', oidc: 'OpenID Connect', api_key: t('ca.auth.api_key'), webhooks: 'Webhooks' },
  noProducts: t('pm.empty'),
  back: t('ca.back'),
  next: t('ca.next'),
  create: t('ca.create'),
  sandboxNote: t('ca.sandboxNote'),
  nameRequired: t('st.nameRequired'),
  invalidUrl: t('cr.invalidUri'),
  error: t('error.generic'),
});

const role = (name: 'owner' | 'admin' | 'developer' | 'reviewer' | 'viewer') => ({
  name: t(`tm.role.${name}`),
  text: t(`tm.role.${name}Text`),
});

export const teamLabels = (): TeamLabels => ({
  members: t('tm.members'),
  membersIntro: t('tm.membersIntro'),
  member: t('tm.member'),
  role: t('tm.role'),
  access: t('tm.access'),
  allApps: t('tm.allApps'),
  you: t('tm.you'),
  roles: { owner: role('owner'), admin: role('admin'), developer: role('developer'), reviewer: role('reviewer'), viewer: role('viewer') },
  invite: t('tm.invite'),
  inviteEmail: t('tm.inviteEmail'),
  inviteHint: t('tm.inviteHint'),
  editAccess: t('tm.editAccess'),
  accessHint: t('tm.accessHint'),
  saveAccess: t('tm.saveAccess'),
  cancel: t('tm.cancel'),
  remove: t('common.remove'),
  testers: t('tm.testers'),
  testersIntro: t('tm.testersIntro'),
  testerEmail: t('tm.inviteEmail'),
  addTester: t('common.add'),
  noTesters: t('tm.noTesters'),
  added: t('tm.added'),
  error: t('error.generic'),
});

export const organizationSettingsLabels = (): OrganizationSettingsLabels => ({
  title: t('os.title'),
  intro: t('os.intro'),
  fields: { name: t('os.name'), description: t('os.description'), support_email: t('os.supportEmail') },
  hints: { support_email: t('os.supportHint') },
  save: t('common.save'),
  saved: t('st.saved'),
  nameRequired: t('os.nameRequired'),
  danger: t('os.danger'),
  dangerText: t('os.dangerText'),
  confirm: t('os.confirm'),
  delete: t('os.delete'),
  error: t('error.generic'),
});

export const productBrowserLabels = (): ProductBrowserLabels => ({
  search: t('pb.search'),
  all: t('pb.all'),
  auth: { oauth2: t('pb.auth.oauth2'), oidc: t('pb.auth.oidc'), api_key: t('pb.auth.api_key'), webhooks: t('pb.auth.webhooks') },
  availability: { ga: t('pb.ga'), beta: t('pb.beta'), sandbox: t('pb.sandboxOnly') },
  approval: { none: t('pb.approval.none'), review: t('ca.approval.review'), restricted: t('ca.approval.restricted') },
  docs: t('pb.docs'),
  empty: t('pm.empty'),
  noMatch: t('pb.noMatch'),
});

export const appReviewLabels = (): AppReviewLabels => ({
  readiness: t('rv.readiness'),
  readinessCount: t('rv.readinessCount'),
  ready: t('rv.ready'),
  checks: launchPathLabels().checks,
  fix: t('lp.fix'),
  status: t('rv.status'),
  stages: {
    draft: t('rv.stage.draft'),
    in_review: t('rv.stage.in_review'),
    changes_requested: t('rv.stage.changes_requested'),
    live: t('rv.stage.live'),
  },
  stageTexts: {
    draft: t('rv.text.draft'),
    in_review: t('rv.text.in_review'),
    changes_requested: t('rv.text.changes_requested'),
    live: t('rv.text.live'),
  },
  feedback: t('rv.feedback'),
  submission: t('rv.submission'),
  submissionIntro: t('rv.submissionIntro'),
  noReviewNeeded: t('rv.noReviewNeeded'),
  justify: t('rv.justify'),
  justifyHint: t('rv.justifyHint'),
  instructions: t('rv.instructions'),
  instructionsHint: t('rv.instructionsHint'),
  submit: t('rv.submission'),
  resubmit: t('rv.resubmit'),
  submitted: t('rv.submitted'),
  missing: t('lp.missing'),
  history: t('rv.history'),
  showSubmission: t('rv.showSubmission'),
  noHistory: t('rv.noHistory'),
  decisions: { pending: t('rv.decision.pending'), approved: t('rv.decision.approved'), rejected: t('rv.decision.rejected') },
  submittedOn: t('rv.submittedOn'),
  decidedOn: t('rv.decidedOn'),
  asked: t('rv.asked'),
  error: t('error.generic'),
});

export const shellLabels = (): ShellLabels => ({
  theme: t('shell.theme'),
  schemes: { light: t('shell.light'), dark: t('shell.dark'), system: t('shell.system') },
  navigation: t('shell.navigation'),
  language: t('nav.language'),
  signOut: t('nav.signOut'),
});

export const pageErrorLabels = (): PageErrorLabels => ({ title: t('page.error.title'), retry: t('page.error.retry') });

export const workspaceNotFoundLabels = (): NotFoundLabels => ({
  title: t('workspace.notFound'),
  text: t('workspace.notFoundText'),
  back: t('workspace.backHome'),
});

export const welcomeLabels = (): WelcomeLabels => ({
  title: t('landing.title'),
  text: t('landing.text'),
  signIn: t('landing.signIn'),
});

export const developerTermsLabels = (): DeveloperTermsLabels => ({
  title: t('terms.title'),
  text: t('terms.text'),
  accept: t('terms.accept'),
  error: t('error.generic'),
});

export const organizationFormLabels = (): OrganizationFormLabels => ({
  title: t('organizations.new'),
  name: t('organizations.name'),
  supportEmail: t('organizations.supportEmail'),
  create: t('common.create'),
  error: t('error.generic'),
});

export const appScopesLabels = (): AppScopesLabels => ({
  title: t('appws.access'),
  manage: t('appws.manage'),
  live: t('appws.scopesLive'),
  waiting: t('appws.scopesWaiting'),
  sandbox: t('appws.scopesSandbox'),
  none: t('appws.none'),
});
