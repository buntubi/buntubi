/** The words of the sign-in notice, from the catalogue, so a language change reaches it. */
import type { AuthNoticeLabels } from '@idp/elements/auth-notice/logic';
import { t } from './i18n.js';

export const authNoticeLabels = (): AuthNoticeLabels => ({
  reasons: {
    access_denied: t('authError.access_denied'),
    state_mismatch: t('authError.state_mismatch'),
    server_error: t('authError.server_error'),
    temporarily_unavailable: t('authError.temporarily_unavailable'),
  },
  generic: t('authError.generic'),
  retry: t('authError.retry'),
  dismiss: t('authError.dismiss'),
});
