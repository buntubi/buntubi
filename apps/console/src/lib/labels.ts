/** Element and shell words, built from the catalogue in one place so a language change reaches them all. */
import type { AccessGateLabels } from '@idp/elements/access-gate/logic';
import type { OrganizationCardLabels } from '@idp/elements/organization-card/logic';
import type { ReviewWaitingLabels } from '@idp/elements/review-waiting/logic';
import type { ScopeFormLabels } from '@idp/elements/scope-form/logic';
import type { ScopeRowLabels } from '@idp/elements/scope-row/logic';
import type { Stat } from '@idp/elements/stat-group/logic';
import type { UserRowLabels } from '@idp/elements/user-row/logic';
import type { AdminOverview } from '@idp/sdk/types';
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

export const organizationCardLabels = (): OrganizationCardLabels => ({
  owner: t('organizations.owner'),
  members: t('organizations.members'),
  apps: t('organizations.apps'),
  approved: t('organizations.approved'),
  suspended: t('organizations.suspended'),
  reason: t('organizations.reason'),
  suspend: t('organizations.suspend'),
  restore: t('organizations.restore'),
  error: t('error.generic'),
});

export const userRowLabels = (): UserRowLabels => ({
  admin: t('users.admin'),
  developer: t('users.developer'),
  mfa: t('users.mfa'),
  unverified: t('users.unverified'),
  disabled: t('users.disabled'),
  enable: t('users.enable'),
  disable: t('users.disable'),
  error: t('error.generic'),
});

const sensitivities = () => ({ public: t('scopes.public'), sensitive: t('scopes.sensitive'), restricted: t('scopes.restricted') });

export const scopeRowLabels = (): ScopeRowLabels => ({ api: t('scopes.api'), sensitivities: sensitivities() });

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
