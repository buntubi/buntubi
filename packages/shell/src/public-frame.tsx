/**
 * The frame of the pages outside a workspace (the welcome, the developer terms, a first
 * organization): the same bar as the focused flows, and one centred column for the page.
 */
import { Show } from '@fluixi/core';
import { Link } from '@fluixi/core/router';
import type { ComponentChild } from '@fluixi/dom';
import { Button } from '@fluixi-ui/button';
import { markOf } from './brand.js';
import { ThemeToggle, type ThemeToggleLabels } from './theme-toggle.js';

export interface PublicFrameLabels extends ThemeToggleLabels {
  /** What follows the brand's name: "Developers". */
  product: string;
  language: string;
  signOut: string;
}

export interface PublicFrameProps {
  brand: { name: string; href: string };
  /** Whether someone is signed in: the bar then offers to sign out. */
  signedIn: boolean;
  signOutHref: string;
  /** Runs just before signing out, to forget what this session chose. */
  onSignOut?: () => void;
  onLanguage: () => void;
  labels: PublicFrameLabels;
  children?: ComponentChild;
}

export function PublicFrame(props: PublicFrameProps): ComponentChild {
  const children = props.children;
  return (
    <div class="frame">
      <style scoped>{`
        .frame { min-height: 100vh; display: flex; flex-direction: column; }
        header { display: flex; align-items: center; gap: 8px; padding: 12px 24px; border-bottom: 1px solid var(--idp-border); background: var(--idp-surface); }
        header :deep(a.brand) { flex: 1; display: inline-flex; align-items: center; gap: 10px; color: var(--idp-text); text-decoration: none; font-weight: 600; }
        .mark { width: 26px; height: 26px; border-radius: 7px; display: grid; place-items: center; background: var(--idp-accent); color: var(--idp-accent-fg); font-weight: 700; font-size: 13px; }
        .product { color: var(--idp-muted); font-weight: 500; }
        main { width: 100%; max-width: 808px; box-sizing: border-box; margin: 0 auto; padding: 56px 24px 72px; }
      `}</style>
      <header>
        <Link class="brand" href={props.brand.href}>
          <span class="mark" aria-hidden="true">{() => markOf(props.brand.name)}</span>
          <span>
            {() => props.brand.name} <span class="product">{() => props.labels.product}</span>
          </span>
        </Link>
        <ThemeToggle labels={props.labels} />
        <Button variant="ghost" tone="neutral" size="sm" onPress={() => props.onLanguage()}>
          {() => props.labels.language}
        </Button>
        <Show when={props.signedIn}>
          <Button
            variant="ghost"
            tone="neutral"
            size="sm"
            onPress={() => {
              // Signing out leaves the app: the provider ends the session, then sends us back.
              props.onSignOut?.();
              window.location.assign(props.signOutHref);
            }}
          >
            {() => props.labels.signOut}
          </Button>
        </Show>
      </header>
      <main>{children}</main>
    </div>
  );
}
