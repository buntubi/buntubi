/**
 * Around the routed page: a page whose data or render failed shows what happened and a way
 * to try again, instead of an empty frame and an uncaught error.
 */
import { ErrorBoundary } from '@fluixi/core';
import type { ComponentChild } from '@fluixi/dom';
import { revalidate } from '@fluixi/start/router';
import '@idp/elements/page-error';
import { errorText } from '../lib/i18n.js';
import { pageErrorLabels } from '../lib/labels.js';

export function PageBoundary(props: { children?: ComponentChild }): ComponentChild {
  const children = props.children;
  return (
    <ErrorBoundary
      fallback={(error: unknown, reset: () => void) => (
        <idp-page-error
          message={errorText(error)}
          labels={pageErrorLabels()}
          onRetry={() => {
            // What failed is cached as failed: drop it, so trying again loads it afresh.
            revalidate(() => true);
            reset();
          }}
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
