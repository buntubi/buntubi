/** The colour scheme, picked from a menu (light, dark, system): the same control in every frame. */
import { For, useColorScheme } from '@fluixi/core';
import type { ComponentChild } from '@fluixi/dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@fluixi-ui/dropdown-menu';
import { icons } from './icons.js';

export const SCHEMES = ['light', 'dark', 'system'] as const;
export type Scheme = (typeof SCHEMES)[number];

export interface ThemeToggleLabels {
  theme: string;
  schemes: Record<Scheme, string>;
}

const ICON: Record<Scheme, string> = { light: icons.sun, dark: icons.moon, system: icons.monitor };

const Icon = (props: { path: string }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
    <path d={props.path} />
  </svg>
);

export function ThemeToggle(props: { labels: ThemeToggleLabels }): ComponentChild {
  const scheme = useColorScheme();
  const current = () => scheme.value() as Scheme;
  return (
    <DropdownMenu placement="bottom-end">
      <style scoped>{`
        .choice { display: flex; align-items: center; gap: 10px; }
      `}</style>
      {/* The trigger wears fluixi-ui's button attributes: it looks like the other icon buttons, skins included. */}
      <DropdownMenuTrigger
        data-variant="outline"
        data-tone="neutral"
        data-size="sm"
        aria-label={() => `${props.labels.theme}: ${props.labels.schemes[current()]}`}
      >
        <Icon path={ICON[current()]} />
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent aria-label={props.labels.theme}>
          <For each={[...SCHEMES]}>
            {(choice) => (
              <DropdownMenuRadioItem checked={current() === choice} onSelect={() => scheme.set(choice)}>
                <span class="choice">
                  <Icon path={ICON[choice]} />
                  {() => props.labels.schemes[choice]}
                </span>
              </DropdownMenuRadioItem>
            )}
          </For>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
}
