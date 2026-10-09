/**
 * The workspace frame the portal and the console share: the sidebar with the signed-in person at
 * its foot, a top bar with the breadcrumb and the theme, and the page. What differs between apps
 * comes in as data; the page comes in as children.
 */
import { For, Show } from '@fluixi/core';
import { Link, useNavigate } from '@fluixi/core/router';
import type { ComponentChild } from '@fluixi/dom';
import '@idp/elements/sidebar';
import type { SidebarContext, SidebarGroup, SidebarLabels } from '@idp/elements/sidebar/logic';
import '@idp/elements/user-menu';
import { markOf } from './brand.js';
import { ThemeToggle, type Scheme } from './theme-toggle.js';

export interface ShellLabels {
  theme: string;
  schemes: Record<Scheme, string>;
  navigation: string;
  language: string;
  signOut: string;
  account: string;
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
  /** Something was picked in the sidebar's switcher: the host keeps the choice and goes there. */
  onSwitch?: (key: string, href: string) => void;
  crumbs: Crumb[];
  /** The signed-in person: the name, and a second line such as the role. */
  user: { name: string; detail: string } | null;
  signOutHref: string;
  /** Runs just before signing out, to forget what this session chose. */
  onSignOut?: () => void;
  onLanguage: () => void;
  labels: ShellLabels;
  children?: ComponentChild;
}

export function Shell(props: ShellProps): ComponentChild {
  const navigate = useNavigate();
  const children = props.children;
  return (
    <div class="shell" data-collapsed={() => (props.collapsed ? '' : undefined)}>
      <style scoped>{`
        .shell { display: flex; min-height: 100vh; }
        /* The column takes the page's height, so its border and background run to the end of a
           long page; the inside sticks to the viewport. */
        .column { flex: none; background: var(--idp-surface); border-right: 1px solid var(--idp-border); }
        .side { position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; }
        .side > :deep(idp-sidebar) { flex: 1; min-height: 0; overflow-y: auto; }
        .foot { padding: 10px 12px 14px; border-top: 1px solid var(--idp-border); }
        .main { flex: 1; min-width: 0; display: flex; flex-direction: column; --idp-topbar: 58px; }
        header { position: sticky; top: 0; z-index: 3; display: flex; align-items: center; gap: 12px; height: var(--idp-topbar); box-sizing: border-box; padding: 12px 28px; border-bottom: 1px solid var(--idp-border); background: var(--idp-surface); }
        .crumbs { flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; color: var(--idp-muted); font-size: 13px; }
        .crumbs :deep(a) { color: var(--idp-muted); text-decoration: none; }
        .crumbs :deep(a:hover) { color: var(--idp-text); }
        .here { color: var(--idp-text); font-weight: 500; }
        main { width: 100%; max-width: 1180px; margin: 0 auto; padding: 32px 28px 56px; box-sizing: border-box; }
        @media (max-width: 720px) {
          .shell { flex-direction: column; }
          .column { border-right: 0; border-bottom: 1px solid var(--idp-border); }
          .side { position: static; height: auto; --idp-sidebar: 100%; }
          .crumbs { overflow: hidden; white-space: nowrap; }
          .main { --idp-topbar: 0px; }
          header { position: static; height: auto; min-height: 58px; }
        }
      `}</style>
      <div class="column">
        <div class="side">
          <idp-sidebar
            brand={{ name: props.brand.name, mark: markOf(props.brand.name), href: props.brand.href }}
            context={props.context}
            groups={props.groups}
            collapsed={props.collapsed}
            labels={props.sidebarLabels}
            onToggle={(event: CustomEvent<{ collapsed: boolean }>) => props.onToggle(event.detail.collapsed)}
            onSwitch={(event: CustomEvent<{ key: string; href: string }>) =>
              props.onSwitch ? props.onSwitch(event.detail.key, event.detail.href) : navigate(event.detail.href)
            }
          />
          <Show when={props.user}>
            <div class="foot">
              <idp-user-menu
                name={props.user?.name ?? ''}
                detail={props.user?.detail ?? ''}
                compact={props.collapsed}
                labels={{ menu: props.labels.account, language: props.labels.language, signOut: props.labels.signOut }}
                onLanguage={() => props.onLanguage()}
                onSignout={() => {
                  // Signing out leaves the app: the provider ends the session, then sends us back.
                  props.onSignOut?.();
                  window.location.assign(props.signOutHref);
                }}
              />
            </div>
          </Show>
        </div>
      </div>
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
          <ThemeToggle labels={props.labels} />
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
