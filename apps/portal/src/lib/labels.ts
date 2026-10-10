/** Element words, built from the catalogue in one place so a language change reaches them all. */
import type { PublicFrameLabels } from '@idp/shell/public-frame';
import type { ReadinessLabels } from '@idp/elements/readiness/logic';
import type { ReviewHistoryLabels } from '@idp/elements/review-history/logic';
import type { ReviewRequestLabels } from '@idp/elements/review-request/logic';
import type { ReviewStagesLabels } from '@idp/elements/review-stages/logic';
import type { ReviewSubmissionLabels } from '@idp/elements/review-submission/logic';
import type { IdeaToLiveLabels } from '@idp/elements/idea-to-live/logic';
import type { NeedsAttentionLabels } from '@idp/elements/needs-attention/logic';
import type { Stat } from '@idp/elements/stat-group/logic';
import type { AppScopesLabels } from '@idp/elements/app-scopes/logic';
import type { DeveloperTermsLabels } from '@idp/elements/developer-terms/logic';
import type { OrganizationFormLabels } from '@idp/elements/organization-form/logic';
import type { Messages } from '@idp/elements/messages';
import type { WelcomeLabels } from '@idp/elements/welcome/logic';
import type { NotFoundLabels } from '@idp/elements/not-found/logic';
import type { PageErrorLabels } from '@idp/elements/page-error/logic';
import type { AppListLabels } from '@idp/elements/app-list/logic';
import type { AppSettingsLabels } from '@idp/elements/app-settings/logic';
import type { CreateAppLabels } from '@idp/elements/create-app/logic';
import type { OrganizationSettingsLabels } from '@idp/elements/organization-settings/logic';
import type { ProductBrowserLabels } from '@idp/elements/product-browser/logic';
import type { TeamLabels } from '@idp/elements/team/logic';
import type { ShellLabels } from '@idp/shell/shell';
import type { CredentialsLabels } from '@idp/elements/credentials/logic';
import type { RedirectUrisLabels } from '@idp/elements/redirect-uris/logic';
import type { AppHeaderLabels } from '@idp/elements/app-header/logic';
import type { LaunchChecklistLabels } from '@idp/elements/launch-checklist/logic';
import type { PathToLiveLabels } from '@idp/elements/path-to-live/logic';
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
    draft: t('apps.draft'),
  },
  statuses: { live: t('apps.live'), in_review: t('apps.inReview'), changes_requested: t('apps.changes'), draft: t('apps.draft') },
  environments: { sandbox: t('apps.sandbox'), live: t('apps.production') },
});

/** Field names as a developer knows them, for what is still missing. */
export const fieldNames = (): Record<string, string> => ({
  name: t('lp.field.name'),
  description: t('lp.field.description'),
  homepage_url: t('lp.field.homepage_url'),
  privacy_url: t('lp.field.privacy_url'),
  terms_url: t('lp.field.terms_url'),
  logo: t('lp.field.logo'),
  support_email: t('lp.field.support_email'),
});

export const pathToLiveLabels = (): PathToLiveLabels => ({
  title: t('lp.path'),
  stepOf: t('lp.stepOf'),
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
});

export const launchChecklistLabels = (): LaunchChecklistLabels => ({
  title: t('lp.checklist'),
  checks: {
    basic_info: t('lp.check.basic_info'),
    redirect_uri: t('lp.check.redirect_uri'),
    products: t('lp.check.products'),
    policies: t('lp.check.policies'),
    support_email: t('lp.check.support_email'),
    permissions: t('lp.check.permissions'),
    review: t('lp.check.review'),
  },
  fields: fieldNames(),
  feedback: t('appws.feedback'),
  openReview: t('lp.openReview'),
  fix: t('lp.fix'),
  edit: t('lp.edit'),
});

export const appHeaderLabels = (): AppHeaderLabels => ({
  firstParty: t('appws.firstParty'),
  firstPartyHelp: t('appws.firstPartyHelp'),
  appId: t('appws.appId'),
  kinds: {
    consumer: t('ca.kind.consumer'),
    business: t('ca.kind.business'),
    web: t('ca.kind.web'),
    mobile: t('ca.kind.mobile'),
    backend: t('ca.kind.backend'),
    internal: t('ca.kind.internal'),
  },
  environments: { sandbox: t('apps.sandbox'), live: t('apps.production') },
  stages: { draft: t('apps.draft'), in_review: t('apps.inReview'), changes_requested: t('apps.changes'), live: t('apps.live') },
  goLive: t('lp.goLive'),
  submit: t('lp.submit'),
  resubmit: t('lp.resubmit'),
  missing: t('lp.missing'),
  error: t('error.generic'),
});

export const credentialsLabels = (): CredentialsLabels => ({
  title: t('appws.credentialsTitle'),
  intro: { sandbox: t('cr.introSandbox'), live: t('cr.introLive') },
  environments: { sandbox: t('apps.sandbox'), live: t('apps.production') },
  environment: t('cr.environment'),
  client: {
    title: t('cr.client'),
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
    secretOnce: t('app.secretOnce'),
    rotationNote: t('cr.rotationNote'),
    noSecret: t('cr.noSecret'),
    redirects: t('cr.redirects'),
    noRedirects: t('cr.noRedirects'),
    manageRedirects: t('cr.manageRedirects'),
    error: t('error.generic'),
  },
  keys: {
    title: t('cr.keys'),
    intro: t('cr.keysHint'),
    empty: t('cr.noKeys'),
    create: t('cr.createKey'),
    cancel: t('common.cancel'),
    name: t('cr.keyName'),
    scopes: t('cr.keyScopes'),
    allScopes: t('cr.allScopes'),
    created: t('cr.keyCreated'),
    keyOnce: t('app.keyOnce'),
    copy: t('common.copy'),
    copied: t('common.copied'),
    revoke: t('common.revoke'),
    error: t('error.generic'),
  },
  signing: { title: t('cr.signing'), text: t('cr.signingText') },
});

export const redirectUrisLabels = (): RedirectUrisLabels => ({
  title: t('cr.redirects'),
  intro: t('cr.redirectsHint'),
  placeholder: 'https://example.com/auth/callback',
  add: t('common.add'),
  remove: t('common.remove'),
  save: t('common.save'),
  saved: t('cr.saved'),
  empty: t('cr.noRedirects'),
  error: t('error.generic'),
});

export const permissionsLabels = (): PermissionsLabels => ({
  title: t('appws.permissionsTitle'),
  intro: t('pm.intro'),
  legend: t('pm.legend'),
  states: {
    live: t('pm.state.live'),
    waiting: t('pm.state.waiting'),
    sandbox: t('pm.state.sandbox'),
    added: t('pm.state.added'),
    available: t('pm.state.available'),
    restricted: t('pm.state.restricted'),
  },
  productDetails: t('pm.productDetails'),
  request: {
    title: t('pm.requestTitle'),
    summary: t('pm.summary'),
    review: t('pm.review'),
    restricted: t('pm.state.restricted'),
    note: t('pm.reviewNote'),
    sandboxNote: t('pm.sandboxNote'),
    save: t('pm.save'),
    saved: t('pm.saved'),
    continue: t('pm.continue'),
  },
  empty: t('pm.empty'),
  error: t('error.generic'),
});

export const appSettingsLabels = (): AppSettingsLabels => ({
  // The page header names the page and says what it is for.
  title: '',
  intro: '',
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

const role = (name: 'owner' | 'manager' | 'developer' | 'reviewer' | 'viewer') => ({
  name: t(`tm.role.${name}`),
  text: t(`tm.role.${name}Text`),
});

export const teamLabels = (): TeamLabels => ({
  tabs: { members: t('tm.tab.members'), testers: t('tm.tab.testers'), label: t('tm.tabs') },
  counts: t('tm.counts'),
  twoStep: t('tm.twoStep'),
  on: t('tm.on'),
  off: t('tm.off'),
  members: t('tm.members'),
  membersIntro: t('tm.membersIntro'),
  member: t('tm.member'),
  role: t('tm.role'),
  access: t('tm.access'),
  allApps: t('tm.allApps'),
  you: t('tm.you'),
  roles: { owner: role('owner'), manager: role('manager'), developer: role('developer'), reviewer: role('reviewer'), viewer: role('viewer') },
  invite: t('tm.inviteMember'),
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
  categories: {
    identity: t('pb.category.identity'),
    profile: t('pb.category.profile'),
    content: t('pb.category.content'),
    communication: t('pb.category.communication'),
    insights: t('pb.category.insights'),
    platform: t('pb.category.platform'),
  },
  empty: t('pm.empty'),
  noMatch: t('pb.noMatch'),
});

const STAGES = ['draft', 'in_review', 'changes_requested', 'live'] as const;
const byStage = (prefix: string) => Object.fromEntries(STAGES.map((stage) => [stage, t(`${prefix}.${stage}`)])) as Record<(typeof STAGES)[number], string>;

export const reviewStagesLabels = (): ReviewStagesLabels => ({
  label: t('rv.stages'),
  stages: {
    draft: t('rv.stage.draft'),
    submitted: t('rv.stage.submitted'),
    in_review: t('rv.stage.in_review'),
    changes_requested: t('rv.stage.changes_requested'),
    approved: t('rv.stage.approved'),
    live: t('rv.stage.live'),
  },
});

export const reviewRequestLabels = (): ReviewRequestLabels => ({
  titles: byStage('rv.head'),
  texts: byStage('rv.text'),
  concerns: t('rv.concerns'),
  reviewer: 'R',
  update: t('rv.update'),
  submit: t('rv.prepare'),
  resubmit: t('rv.resubmit'),
});

export const reviewHistoryLabels = (): ReviewHistoryLabels => ({
  title: t('rv.history'),
  empty: t('rv.noHistory'),
  submitted: t('rv.event.submitted'),
  inReview: t('rv.decision.pending'),
  approved: t('rv.event.approved'),
  rejected: t('rv.decision.rejected'),
  reviewer: t('rv.reviewer'),
  submission: t('rv.submissionN'),
});

export const readinessLabels = (): ReadinessLabels => ({
  ready: t('rv.readyTitle'),
  left: t('rv.left'),
  submit: t('rv.submission'),
  note: t('rv.readyNote'),
});

export const reviewSubmissionLabels = (): ReviewSubmissionLabels => ({
  checks: launchChecklistLabels().checks,
  complete: t('rv.complete'),
  permissions: t('rv.permissions'),
  explained: t('rv.explained'),
  question: t('rv.justify'),
  hint: t('rv.justifyHint'),
  explainedLabel: t('rv.explainedLabel'),
  missingLabel: t('rv.required'),
  instructions: t('rv.instructions'),
  instructionsHint: t('rv.instructionsHint'),
  submit: t('rv.submission'),
  resubmit: t('rv.resubmit'),
  submitted: t('rv.submitted'),
  missing: t('lp.missing'),
  noReviewNeeded: t('rv.noReviewNeeded'),
  error: t('error.generic'),
});

export const shellLabels = (): ShellLabels => ({
  theme: t('shell.theme'),
  schemes: { light: t('shell.light'), dark: t('shell.dark'), system: t('shell.system') },
  navigation: t('shell.navigation'),
  language: t('nav.language'),
  signOut: t('nav.signOut'),
  account: t('shell.account'),
});

export const pageErrorLabels = (): PageErrorLabels => ({ title: t('page.error.title'), retry: t('page.error.retry') });

export const workspaceNotFoundLabels = (): NotFoundLabels => ({
  title: t('workspace.notFound'),
  text: t('workspace.notFoundText'),
  back: t('workspace.backHome'),
});

export const pluginNotFoundLabels = (): NotFoundLabels => ({
  title: t('plugins.notFound'),
  text: t('plugins.notFoundText'),
  back: t('plugins.back'),
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

/** Home's counts: the apps and how many are live, and what waits on the members. */
export const homeStats = (apps: { environment: string; review_status: string }[]): Stat[] => {
  const live = apps.filter((app) => app.environment === 'live').length;
  const waiting = apps.filter((app) => app.review_status === 'rejected').length;
  return [
    { key: 'apps', label: t('home.stat.apps'), value: apps.length, note: t('home.stat.live', { n: live }), tone: 'muted' },
    {
      key: 'awaiting',
      label: t('home.stat.awaiting'),
      value: waiting,
      note: waiting ? t('home.stat.changes') : t('home.stat.nothing'),
      tone: waiting ? 'warn' : 'muted',
    },
  ];
};

export const needsAttentionLabels = (): NeedsAttentionLabels => ({
  title: t('home.attention'),
  empty: t('home.stat.nothing'),
  changes: t('home.attention.changes'),
  inReview: t('home.attention.inReview'),
  inReviewText: t('home.attention.inReviewText'),
});

export const ideaToLiveLabels = (): IdeaToLiveLabels => ({ title: t('home.path'), steps: t('home.path.steps').split('|') });

export const publicFrameLabels = (): PublicFrameLabels => ({ ...shellLabels(), product: t('shell.developers') });

/** Validation keys the schemas in @idp/sdk/schemas use. */
export const formMessages = (): Messages => ({
  'form.required': t('form.required'),
  'form.email': t('form.email'),
  'form.tooLong': t('form.tooLong'),
  'form.url': t('form.url'),
  'form.https': t('form.https'),
  'form.redirectUri': t('form.redirectUri'),
  'form.scopeList': t('form.scopeList'),
});
