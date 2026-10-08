/**
 * The workspace frame the portal and the console share: the sidebar, a top bar with the
 * breadcrumb, the theme, the language, the signed-in person and signing out, and the page.
 * What differs between apps comes in as data; the page comes in as children.
 */
import { For, Show, useColorScheme } from '@fluixi/core';
import { Link } from '@fluixi/core/router';
import type { ComponentChild } from '@fluixi/dom';
import { Button } from '@fluixi-ui/button';
import '@idp/elements/sidebar';
import type { SidebarContext, SidebarGroup, SidebarLabels } from '@idp/elements/sidebar/logic';
import { markOf } from './brand.js';
import { icons } from './icons.js';

const SCHEMES = ['light', 'dark', 'system'] as const;
type Scheme = (typeof SCHEMES)[number];

export interface ShellLabels {
  theme: string;
  schemes: Record<Scheme, string>;
  navigation: string;
  language: string;
  signOut: string;
}

export interface Crumb {
  label: string;
  /** Absent for the page itself. */
  href?: string;
}

export interface ShellProps {
  brand: { name: string; href: string };
  context: SidebarContext | null;
  groups: SidebarGroup[];
  sidebarLabels: SidebarLabels;
  collapsed: boolean;
  onToggle: (collapsed: boolean) => void;
  crumbs: Crumb[];
  user: { name: string; email: string } | null;
  signOutHref: string;
  onLanguage: () => void;
  labels: ShellLabels;
  children?: ComponentChild;
}

export function Shell(props: ShellProps): ComponentChild {
  const scheme = useColorScheme();
  const children = props.children;
  const next = (): Scheme => SCHEMES[(SCHEMES.indexOf(scheme.value() as Scheme) + 1) % SCHEMES.length]!;
  const icon = () => (scheme.value() === 'system' ? icons.monitor : scheme.value() === 'dark' ? icons.moon : icons.sun);
  return (
    <div class="shell" data-collapsed={() => (props.collapsed ? '' : undefined)}>
      <style scoped>{`
        .shell { display: flex; min-height: 100vh; }
        .side { position: sticky; top: 0; height: 100vh; flex: none; }
        .main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        header { display: flex; align-items: center; gap: 12px; padding: 10px 28px; border-bottom: 1px solid var(--dp-border); background: var(--dp-surface); }
        .crumbs { flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; color: var(--dp-muted); font-size: 13px; }
        .crumbs :deep(a) { color: var(--dp-muted); text-decoration: none; }
        .crumbs :deep(a:hover) { color: var(--dp-text); }
        .here { color: var(--dp-text); font-weight: 500; }
        .actions { display: flex; align-items: center; gap: 8px; }
        .signout { color: var(--dp-muted); font-size: 13px; text-decoration: none; }
        .signout:hover { color: var(--dp-text); }
        .avatar { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: var(--dp-accent-soft); color: var(--dp-accent-ink); font-size: 12px; font-weight: 700; }
        main { width: 100%; max-width: 1180px; margin: 0 auto; padding: 32px 28px 56px; box-sizing: border-box; }
        @media (max-width: 720px) {
          .shell { flex-direction: column; }
          .side { position: static; height: auto; --dp-sidebar: 100%; }
          header { flex-wrap: wrap; row-gap: 8px; }
          .crumbs { flex-basis: 100%; overflow: hidden; white-space: nowrap; }
        }
      `}</style>
      <dp-sidebar
        class="side"
        brand={{ name: props.brand.name, mark: markOf(props.brand.name), href: props.brand.href }}
        context={props.context}
        groups={props.groups}
        collapsed={props.collapsed}
        labels={props.sidebarLabels}
        onToggle={(event: CustomEvent<{ collapsed: boolean }>) => props.onToggle(event.detail.collapsed)}
      />
      <div class="main">
        <header part="topbar">
          <nav class="crumbs" aria-label={() => props.labels.navigation}>
            <For each={props.crumbs}>
              {(crumb, index) => (
                <>
                  <Show when={index() > 0}>
                    <span aria-hidden="true">/</span>
                  </Show>
                  <Show when={crumb.href} fallback={<span class="here" aria-current="page">{crumb.label}</span>}>
                    <Link href={crumb.href ?? ''}>{crumb.label}</Link>
                  </Show>
                </>
              )}
            </For>
          </nav>
          <div class="actions">
            <Button
              variant="outline"
              tone="neutral"
              size="sm"
              aria-label={() => `${props.labels.theme}: ${props.labels.schemes[scheme.value() as Scheme]}`}
              title={() => props.labels.schemes[next()]}
              onPress={() => scheme.set(next())}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                <path d={icon()} />
              </svg>
            </Button>
            <Button variant="ghost" tone="neutral" size="sm" onPress={() => props.onLanguage()}>
              {() => props.labels.language}
            </Button>
            <a class="signout" href={() => props.signOutHref}>
              {() => props.labels.signOut}
            </a>
            <Show when={props.user}>
              <span class="avatar" title={() => props.user?.email ?? ''}>
                {() => markOf(props.user?.name || props.user?.email)}
              </span>
            </Show>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
