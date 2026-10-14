/** The sidebar's default look: a full panel, or an icon rail when collapsed. */
import { Button } from '@fluixi-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@fluixi-ui/dropdown-menu';
import { For, Show } from '@fluixi/core';
import { Link } from '../link.js';
import { viewToken } from '../view.js';
import type { SidebarContext, SidebarItem, SidebarLogic, SidebarSwitcher } from './logic.js';

const PANEL = 'M3 4h18v16H3zM9 4v16';
const UPDOWN = 'm7 15 5 5 5-5M7 9l5-5 5 5';
const TICK = 'M5 12.5l4.5 4.5L19 7.5';

function Icon(props: { path: string; size?: number }) {
  return (
    <svg width={props.size ?? 16} height={props.size ?? 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d={props.path} />
    </svg>
  );
}

export const sidebarView = (s: SidebarLogic) => {
  const item = (entry: SidebarItem) => (
    <Link
      href={entry.href}
      part="item"
      class="item"
      aria-current={entry.current ? 'page' : undefined}
      title={() => (s.collapsed() ? entry.label : undefined)}
    >
      <Icon path={entry.icon} />
      <span class="label">{entry.label}</span>
      <Show when={entry.count}>
        <span part="count" class="count">{entry.count}</span>
      </Show>
    </Link>
  );
  return (
    <nav part="sidebar" class="sidebar" data-collapsed={() => (s.collapsed() ? '' : undefined)} aria-label={() => s.labels().navigation}>
      {/* A Link draws its own <a>, which the scope does not stamp: links are styled through a
          stamped parent with :deep(). */}
      <style scoped>{`
        .sidebar { box-sizing: border-box; width: var(--idp-sidebar); display: flex; flex-direction: column; gap: 12px; padding: 14px 12px; font-size: 14px; }
        .sidebar[data-collapsed] { width: var(--idp-rail); padding: 12px 8px; align-items: center; }
        .top { display: flex; align-items: center; gap: 8px; }
        .top :deep(.brand) { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; padding: 4px 6px; color: var(--idp-text); text-decoration: none; font-weight: 600; font-size: 15px; }
        .mark { flex: none; width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; background: var(--idp-accent); color: var(--idp-accent-fg); font-weight: 700; font-size: 14px; }
        .sub { color: var(--idp-muted); font-weight: 500; }
        .brand-text { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sidebar :deep(.back) { display: flex; align-items: center; gap: 8px; padding: 2px 8px; color: var(--idp-muted); font-size: 13px; text-decoration: none; }
        .context { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid var(--idp-border); border-radius: 10px; background: var(--idp-surface-2); }
        .context-mark { flex: none; width: 26px; height: 26px; border-radius: 7px; display: grid; place-items: center; background: var(--idp-accent-soft); color: var(--idp-accent-ink); font-size: 12px; font-weight: 700; }
        .context-text { display: flex; flex-direction: column; min-width: 0; }
        .context-name { font-weight: 600; font-size: 13px; }
        .context-detail { color: var(--idp-muted); font-size: 12px; }
        .chevrons { margin-left: auto; color: var(--idp-muted); display: grid; }
        .menu-item { display: flex; align-items: center; gap: 10px; min-width: 200px; }
        .menu-mark { flex: none; width: 22px; height: 22px; border-radius: 6px; display: grid; place-items: center; background: var(--idp-accent-soft); color: var(--idp-accent-ink); font-size: 11px; font-weight: 700; }
        .menu-text { flex: 1; display: grid; min-width: 0; }
        .menu-detail { color: var(--idp-muted); font-size: 12px; }
        .groups { display: flex; flex-direction: column; gap: 14px; width: 100%; }
        .group { display: flex; flex-direction: column; gap: 1px; }
        .heading { padding: 0 10px 6px; color: var(--idp-muted); font-size: 11.5px; font-weight: 500; }
        .group :deep(.item) { display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: var(--idp-radius-sm); color: var(--idp-muted); text-decoration: none; font-weight: 500; }
        .group :deep(.item:hover) { background: var(--idp-surface-2); color: var(--idp-text); }
        .group :deep(.item[aria-current='page']) { background: var(--idp-surface-2); color: var(--idp-text); font-weight: 600; }
        .label { flex: 1; }
        .count { padding: 0 7px; border-radius: 10px; background: color-mix(in srgb, var(--idp-warn) 16%, transparent); color: var(--idp-warn); font-size: 11.5px; font-weight: 600; }
        .sidebar[data-collapsed] .label, .sidebar[data-collapsed] .count, .sidebar[data-collapsed] .sub, .sidebar[data-collapsed] .brand-text, .sidebar[data-collapsed] .heading, .sidebar[data-collapsed] .context-text, .sidebar[data-collapsed] :deep(.back span) { display: none; }
        .sidebar[data-collapsed] .top { flex-direction: column; }
        .sidebar[data-collapsed] .group :deep(.item) { justify-content: center; padding: 10px; }
        .sidebar[data-collapsed] .context { padding: 6px; border: 0; background: none; }
        .sidebar[data-collapsed] .chevrons { display: none; }
        .sidebar[data-collapsed] .groups { gap: 6px; }
      `}</style>
      <div class="top">
        <Link href={() => s.brand().href} class="brand">
          <span class="mark">{() => s.brand().mark}</span>
          <span class="brand-text">
            {() => s.brand().name} <span class="sub">{() => s.labels().product}</span>
          </span>
        </Link>
        <Button
          variant="ghost"
          tone="neutral"
          size="sm"
          part="toggle"
          aria-expanded={() => (s.collapsed() ? 'false' : 'true')}
          aria-label={() => (s.collapsed() ? s.labels().expand : s.labels().collapse)}
          onPress={s.toggle}
        >
          <Icon path={s.collapsed() ? `${PANEL}M13 10l2 2-2 2` : `${PANEL}M16 10l-2 2 2 2`} />
        </Button>
      </div>
      <Show when={s.context()}>
        {(context: SidebarContext) => (
          <>
            <Show when={context.back}>
              {(back: { label: string; href: string }) => (
                <Link href={back.href} class="back" title={back.label}>
                  <Icon path="M19 12H5M12 19l-7-7 7-7" size={14} />
                  <span>{back.label}</span>
                </Link>
              )}
            </Show>
            <Show
              when={context.switcher}
              fallback={
                <div part="context" class="context" title={context.name}>
                  <span class="context-mark">{context.mark}</span>
                  <span class="context-text">
                    <span class="context-name">{context.name}</span>
                    <span class="context-detail">{context.detail}</span>
                  </span>
                </div>
              }
            >
              {(switcher: SidebarSwitcher) => (
                <DropdownMenu placement="bottom-start">
                  <DropdownMenuTrigger data-switcher="" part="context" title={context.name} aria-label={`${switcher.label}: ${context.name}`}>
                    <span class="context-mark">{context.mark}</span>
                    <span class="context-text">
                      <span class="context-name">{context.name}</span>
                      <span class="context-detail">{context.detail}</span>
                    </span>
                    <span class="chevrons">
                      <Icon path={UPDOWN} size={14} />
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>{switcher.label}</DropdownMenuLabel>
                      <For each={switcher.items}>
                        {(item) => (
                          <DropdownMenuItem onSelect={() => s.switchTo(item.key, item.href)} aria-current={item.current ? 'true' : undefined}>
                            <span class="menu-item">
                              <span class="menu-mark">{item.mark}</span>
                              <span class="menu-text">
                                <span>{item.label}</span>
                                <Show when={item.detail}>
                                  <span class="menu-detail">{item.detail}</span>
                                </Show>
                              </span>
                              <Show when={item.current}>
                                <Icon path={TICK} size={14} />
                              </Show>
                            </span>
                          </DropdownMenuItem>
                        )}
                      </For>
                      <Show when={switcher.actions.length}>
                        <DropdownMenuSeparator />
                        <For each={switcher.actions}>
                          {(action) => <DropdownMenuItem onSelect={() => s.switchTo(action.key, action.href)}>{action.label}</DropdownMenuItem>}
                        </For>
                      </Show>
                    </DropdownMenuContent>
                  </DropdownMenuPortal>
                </DropdownMenu>
              )}
            </Show>
          </>
        )}
      </Show>
      <Show when={s.searchable()}>
        <Button variant="outline" tone="neutral" size="sm" part="search" aria-label={() => s.labels().search} onPress={s.search}>
          <Icon path="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-3.5-3.5" />
          <span class="label">{() => s.labels().search}</span>
        </Button>
      </Show>
      <div class="groups">
        <For each={s.groups()}>
          {(group) => (
            <div part="group" class="group">
              <Show when={group.label}>
                <span class="heading">{group.label}</span>
              </Show>
              <For each={group.items}>{item}</For>
            </div>
          )}
        </For>
      </div>
    </nav>
  );
};

export const SidebarView = viewToken<SidebarLogic>('idp-sidebar', sidebarView);
