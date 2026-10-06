import type { ComponentChild } from '@fluixi/dom';
import { Badge } from '@fluixi-ui/badge';
import { t } from '../lib/i18n.js';

/** Sandbox or live, and the review state when there is one. */
export function EnvBadge(props: { environment: 'sandbox' | 'live'; review?: string }): ComponentChild {
  return (
    <span class="badges">
      <Badge variant="soft" tone={props.environment === 'live' ? 'success' : 'warning'}>
        {() => t(props.environment === 'live' ? 'env.live' : 'env.sandbox')}
      </Badge>
      {() =>
        props.review === 'pending' || props.review === 'rejected' ? (
          <Badge variant="outline" tone={props.review === 'pending' ? 'info' : 'danger'}>
            {t(props.review === 'pending' ? 'review.pending' : 'review.rejected')}
          </Badge>
        ) : null
      }
    </span>
  );
}
