/** Element and shell words, built from the catalogue in one place so a language change reaches them all. */
import type { AccessGateLabels } from '@idp/elements/access-gate/logic';
import type { NotFoundLabels } from '@idp/elements/not-found/logic';
import type { OrganizationListLabels } from '@idp/elements/organization-list/logic';
import type { OrganizationRowLabels } from '@idp/elements/organization-row/logic';
import type { ReviewWaitingLabels } from '@idp/elements/review-waiting/logic';
import type { ScopeFormLabels } from '@idp/elements/scope-form/logic';
import type { ScopeListLabels } from '@idp/elements/scope-list/logic';
import type { ScopeRowLabels } from '@idp/elements/scope-row/logic';
import type { Stat } from '@idp/elements/stat-group/logic';
import type { ClientDetailLabels } from '@idp/elements/client-detail/logic';
import type { ClientListLabels } from '@idp/elements/client-list/logic';
import type { ClientRowLabels } from '@idp/elements/client-row/logic';
import type { UserCreateLabels } from '@idp/elements/user-create/logic';
import type { UserListLabels } from '@idp/elements/user-list/logic';
import type { UserProfileLabels } from '@idp/elements/user-profile/logic';
import type { Messages } from '@idp/elements/messages';
import type { UserRowLabels } from '@idp/elements/user-row/logic';
import type { AdminOverview } from '@buntubi/sdk/types';
import type { PageErrorLabels } from '@idp/elements/page-error/logic';
import type { ReviewDecisionLabels } from '@idp/elements/review-decision/logic';
import type { ReviewQueueLabels } from '@idp/elements/review-queue/logic';
import type { SidebarLabels } from '@idp/elements/sidebar/logic';
import type { ShellLabels } from '@idp/shell/shell';
import { t } from './i18n.js';
import { paths } from './paths.js';

export const sidebarLabels = (): SidebarLabels => ({
  product: t('shell.product'),
  collapse: t('shell.collapse'),
  expand: t('shell.expand'),
  search: t('shell.search'),
  navigation: t('shell.navigation'),
});

export const shellLabels = (): ShellLabels => ({
  theme: t('shell.theme'),
  schemes: { light: t('shell.light'), dark: t('shell.dark'), system: t('shell.system') },
  navigation: t('shell.navigation'),
  language: t('nav.language'),
  signOut: t('nav.signOut'),
  account: t('shell.account'),
});

export const reviewQueueLabels = (): ReviewQueueLabels => ({
  app: t('rq.app'),
  organization: t('rq.organization'),
  scopes: t('rq.scopes'),
  waiting: t('rq.waiting'),
  open: t('rq.open'),
  empty: t('reviews.empty'),
  days: t('rq.days'),
  hours: t('rq.hours'),
});

export const reviewDecisionLabels = (): ReviewDecisionLabels => ({
  organization: t('rd.organization'),
  owner: t('rd.owner'),
  support: t('rd.support'),
  none: t('rd.none'),
  consent: t('rd.consent'),
  consentText: t('rd.consentText'),
  links: t('rd.links'),
  homepage: t('rd.homepage'),
  privacy: t('rd.privacy'),
  terms: t('rd.terms'),
  missing: t('rd.missing'),
  redirects: t('rd.redirects'),
  request: t('rd.request'),
  justification: t('rd.justification'),
  noJustification: t('rd.noJustification'),
  instructions: t('rd.instructions'),
  noInstructions: t('rd.noInstructions'),
  history: t('rd.history'),
  decisions: { pending: t('rd.pending'), approved: t('rd.approved'), rejected: t('rd.rejected') },
  submittedOn: t('rd.submittedOn'),
  decidedOn: t('rd.decidedOn'),
  decision: t('rd.decision'),
  note: t('rd.note'),
  noteHint: t('rd.noteHint'),
  approve: t('rd.approve'),
  reject: t('rd.reject'),
  decided: t('rd.decided'),
  notPending: t('rd.notPending'),
  error: t('error.generic'),
});

export const accessGateLabels = (): AccessGateLabels => ({
  titles: { signed_out: t('gate.signedOut.title'), not_admin: t('gate.notAdmin.title'), mfa_required: t('gate.mfa.title') },
  texts: { signed_out: t('gate.signedOut.text'), not_admin: t('gate.notAdmin.text'), mfa_required: t('gate.mfa.text') },
  signIn: t('gate.signIn'),
  account: t('gate.mfa.account'),
  signOut: t('gate.signOut'),
  otherAccount: t('gate.otherAccount'),
});

export const pageErrorLabels = (): PageErrorLabels => ({ title: t('page.error.title'), retry: t('page.error.retry') });

/** The overview's counts, in reading order, each leading to its page. */
export const overviewStats = (counts: AdminOverview | null): Stat[] => {
  const stat = (key: keyof AdminOverview, label: string, href: string): Stat => ({
    key,
    label: t(label),
    value: counts?.[key] ?? 0,
    href,
    attention: key === 'pending_reviews' && (counts?.[key] ?? 0) > 0,
  });
  return [
    stat('pending_reviews', 'overview.pending', paths.reviews()),
    stat('users', 'overview.users', paths.users()),
    stat('developers', 'overview.developers', paths.users()),
    stat('organizations', 'overview.organizations', paths.organizations()),
    stat('suspended_organizations', 'overview.suspended', paths.organizations()),
    stat('live_apps', 'overview.live', paths.organizations()),
    stat('sandbox_apps', 'overview.sandbox', paths.organizations()),
  ];
};

export const reviewWaitingLabels = (): ReviewWaitingLabels => ({
  title: t('reviews.title'),
  empty: t('reviews.empty'),
  open: t('rq.open'),
});

export const organizationListLabels = (): OrganizationListLabels => ({
  title: t('organizations.title'),
  organization: t('organizations.organization'),
  owner: t('organizations.owner'),
  members: t('organizations.members'),
  apps: t('organizations.apps'),
  approved: t('organizations.approved'),
  status: t('common.status'),
  empty: t('common.none'),
});

export const organizationRowLabels = (): OrganizationRowLabels => ({
  platform: t('orgs.platform'),
  platformHelp: t('orgs.platformHelp'),
  approved: t('organizations.approved'),
  none: t('organizations.noScope'),
  active: t('organizations.active'),
  suspended: t('organizations.suspended'),
  reason: t('organizations.reason'),
  suspend: t('organizations.suspend'),
  confirm: t('organizations.confirm'),
  cancel: t('common.cancel'),
  restore: t('organizations.restore'),
  error: t('error.generic'),
});

export const userListLabels = (): UserListLabels => ({
  title: t('users.title'),
  user: t('users.user'),
  status: t('common.status'),
  roles: t('users.roles'),
  twoStep: t('users.twoStep'),
  signedUp: t('users.signedUp'),
  lastSignIn: t('users.lastSignIn'),
  empty: t('common.none'),
});

export const userRowLabels = (): UserRowLabels => ({
  admin: t('users.admin'),
  superadmin: t('users.superadmin'),
  never: t('users.never'),
  invited: t('users.invited'),
  actions: t('users.actions'),
  makeAdmin: t('users.makeAdmin'),
  removeAdmin: t('users.removeAdmin'),
  developer: t('users.developer'),
  mfa: t('users.twoStep'),
  unverified: t('users.unverified'),
  disabled: t('users.disabled'),
  active: t('users.active'),
  on: t('common.on'),
  off: t('common.off'),
  enable: t('users.enable'),
  disable: t('users.disable'),
  error: t('error.generic'),
});

export const clientListLabels = (): ClientListLabels => ({
  title: t('apps.title'),
  app: t('apps.app'),
  organization: t('apps.organization'),
  environment: t('apps.environment'),
  firstParty: t('apps.firstParty'),
  empty: t('common.none'),
});

export const clientRowLabels = (): ClientRowLabels => ({
  platform: t('apps.platform'),
  live: t('apps.live'),
  sandbox: t('apps.sandbox'),
  disabled: t('apps.disabled'),
  firstParty: t('apps.firstParty'),
  notPlatform: t('apps.notPlatform'),
  error: t('error.generic'),
});

export const clientDetailLabels = (): ClientDetailLabels => ({
  overview: t('apps.overview'),
  organization: t('apps.organization'),
  platform: t('apps.platform'),
  environment: t('apps.environment'),
  live: t('apps.live'),
  sandbox: t('apps.sandbox'),
  review: t('apps.review'),
  reviews: {
    none: t('apps.review.none'),
    pending: t('apps.review.pending'),
    approved: t('apps.review.approved'),
    rejected: t('apps.review.rejected'),
  },
  type: t('apps.type'),
  confidential: t('apps.confidential'),
  public: t('apps.public'),
  clientId: t('apps.clientId'),
  created: t('apps.created'),
  signIn: t('apps.signIn'),
  redirects: t('apps.redirects'),
  noRedirects: t('apps.noRedirects'),
  permissions: t('apps.permissions'),
  firstParty: t('apps.firstParty'),
  firstPartyHelp: t('apps.firstPartyHelp'),
  notPlatform: t('apps.notPlatformDetail'),
  access: t('apps.access'),
  disabledHelp: t('apps.disabledHelp'),
  enabledHelp: t('apps.enabledHelp'),
  disable: t('apps.disable'),
  enable: t('apps.enable'),
  openInPortal: t('apps.openInPortal'),
  portalHelp: t('apps.portalHelp'),
  error: t('error.generic'),
});

/** Validation keys the schemas in @buntubi/sdk/schemas use. */
export const formMessages = (): Messages => ({
  'form.required': t('form.required'),
  'form.email': t('form.email'),
  'form.tooLong': t('form.tooLong'),
  'form.passwordShort': t('form.passwordShort'),
  'form.country': t('form.country'),
  'form.phone': t('form.phone'),
  'form.scopeName': t('form.scopeName'),
  'form.productSlug': t('form.productSlug'),
});

const languages = () => ({ fr: t('users.lang.fr'), en: t('users.lang.en') });

export const userCreateLabels = (): UserCreateLabels => ({
  title: t('users.create.title'),
  email: t('users.email'),
  givenName: t('users.givenName'),
  familyName: t('users.familyName'),
  language: t('users.language'),
  languages: languages(),
  mode: t('users.create.mode'),
  modes: { invite: t('users.create.invite'), password: t('users.create.ready') },
  inviteHelp: t('users.create.inviteHelp'),
  passwordHelp: t('users.create.readyHelp'),
  password: t('users.create.password'),
  create: t('users.create.submit'),
  pending: t('users.create.pending'),
  error: t('error.generic'),
});

export const userProfileLabels = (): UserProfileLabels => ({
  profile: t('users.profile'),
  givenName: t('users.givenName'),
  familyName: t('users.familyName'),
  language: t('users.language'),
  languages: languages(),
  country: t('users.country'),
  countryHint: t('users.countryHint'),
  phone: t('users.phone'),
  phoneHint: t('users.phoneHint'),
  address: t('users.address'),
  street: t('users.street'),
  postalCode: t('users.postalCode'),
  locality: t('users.locality'),
  region: t('users.region'),
  addressCountry: t('users.addressCountry'),
  save: t('users.save'),
  saved: t('users.saved'),
  account: t('users.account'),
  email: t('users.email'),
  verified: t('users.verified'),
  unverified: t('users.unverified'),
  signedUp: t('users.signedUp'),
  lastSignIn: t('users.lastSignIn'),
  never: t('users.never'),
  password: t('users.password'),
  passwordSet: t('users.passwordSet'),
  passwordInvited: t('users.passwordInvited'),
  twoStep: t('users.twoStep'),
  on: t('common.on'),
  off: t('common.off'),
  sessions: t('users.sessions'),
  portal: t('users.portal'),
  portalSince: t('users.portalSince'),
  noPortal: t('users.noPortal'),
  organizations: t('users.organizations'),
  noOrganization: t('users.noOrganization'),
  platform: t('apps.platform'),
  roles: {
    owner: t('users.role.owner'),
    manager: t('users.role.manager'),
    developer: t('users.role.developer'),
    reviewer: t('users.role.reviewer'),
    viewer: t('users.role.viewer'),
  },
  security: t('users.access'),
  sendReset: t('users.sendReset'),
  sendResetHelp: t('users.sendResetHelp'),
  resetSent: t('users.resetSent'),
  signOut: t('users.signOut'),
  signOutHelp: t('users.signOutHelp'),
  signedOut: t('users.signedOut'),
  resetTwoStep: t('users.resetTwoStep'),
  resetTwoStepHelp: t('users.resetTwoStepHelp'),
  twoStepReset: t('users.twoStepReset'),
  disable: t('users.disableAccount'),
  enable: t('users.enableAccount'),
  disableHelp: t('users.disableHelp'),
  disabled: t('users.nowDisabled'),
  enabled: t('users.nowEnabled'),
  makeAdmin: t('users.makeAdmin'),
  removeAdmin: t('users.removeAdmin'),
  adminHelp: t('users.adminHelp'),
  adminGiven: t('users.adminGiven'),
  adminRemoved: t('users.adminRemoved'),
  superadminHelp: t('users.superadminHelp'),
  yourselfHelp: t('users.yourselfHelp'),
  error: t('error.generic'),
});

const sensitivities = () => ({ public: t('scopes.public'), sensitive: t('scopes.sensitive'), restricted: t('scopes.restricted') });

export const scopeListLabels = (): ScopeListLabels => ({
  title: t('scopes.catalog'),
  scope: t('scopes.scope'),
  description: t('scopes.description'),
  api: t('scopes.api'),
  sensitivity: t('scopes.sensitivity'),
  all: t('scopes.all'),
  sensitivities: sensitivities(),
  empty: t('common.none'),
});

export const scopeRowLabels = (): ScopeRowLabels => ({ signIn: t('scopes.signIn'), sensitivities: sensitivities() });

export const scopeFormLabels = (): ScopeFormLabels => ({
  title: t('scopes.new'),
  name: t('scopes.name'),
  sensitivity: t('scopes.sensitivity'),
  sensitivities: sensitivities(),
  resource: t('scopes.resource'),
  fr: t('scopes.fr'),
  en: t('scopes.en'),
  create: t('scopes.create'),
  error: t('error.generic'),
});

export const pluginNotFoundLabels = (): NotFoundLabels => ({
  title: t('plugins.notFound'),
  text: t('plugins.notFoundText'),
  back: t('plugins.back'),
});
