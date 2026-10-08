/** Element and shell words, built from the catalogue in one place so a language change reaches them all. */
import type { ReviewDecisionLabels } from '@idp/elements/review-decision/logic';
import type { ReviewQueueLabels } from '@idp/elements/review-queue/logic';
import type { SidebarLabels } from '@idp/elements/sidebar/logic';
import type { ShellLabels } from '@idp/shell/shell';
import { t } from './i18n.js';

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
