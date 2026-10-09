/**
 * The frame for a focused flow: the brand and the flow's name as a breadcrumb, the theme, a way
 * out, and the page. No sidebar, so nothing pulls the reader elsewhere until the flow is done
 * or left.
 */
import type { ComponentChild } from '@fluixi/dom';
import { Link, useNavigate } from '@fluixi/core/router';
import { Button } from '@fluixi-ui/button';
import { markOf } from './brand.js';
import { icons } from './icons.js';
import { ThemeToggle, type ThemeToggleLabels } from './theme-toggle.js';

export interface FocusedProps {
  brand: { name: string; href: string };
  title: string;
  close: { label: string; href: string };
  labels: ThemeToggleLabels;
  children?: ComponentChild;
}

export function Focused(props: FocusedProps): ComponentChild {
  const navigate = useNavigate();
  const children = props.children;
  return (
    <div class="focused">
      <style scoped>{`
        .focused { min-height: 100vh; display: flex; flex-direction: column; }
        header { display: flex; align-items: center; gap: 12px; padding: 12px 24px; border-bottom: 1px solid var(--idp-border); background: var(--idp-surface); }
        header :deep(a.brand) { display: inline-flex; align-items: center; gap: 10px; color: var(--idp-text); text-decoration: none; font-weight: 600; }
        .mark { width: 26px; height: 26px; border-radius: 7px; display: grid; place-items: center; background: var(--idp-accent); color: var(--idp-accent-fg); font-weight: 700; font-size: 13px; }
        .sep { color: var(--idp-border-2); }
        .title { flex: 1; font-weight: 500; }
        main { width: 100%; max-width: 1028px; box-sizing: border-box; margin: 0 auto; padding: 36px 24px 56px; }
      `}</style>
      <header>
        <Link class="brand" href={props.brand.href}>
          <span class="mark" aria-hidden="true">{() => markOf(props.brand.name)}</span>
          {() => props.brand.name}
        </Link>
        <span class="sep" aria-hidden="true">/</span>
        <span class="title">{() => props.title}</span>
        <ThemeToggle labels={props.labels} />
        <Button variant="outline" tone="neutral" size="sm" aria-label={() => props.close.label} onPress={() => navigate(props.close.href)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
            <path d={icons.close} />
          </svg>
        </Button>
      </header>
      <main>{children}</main>
    </div>
  );
}
