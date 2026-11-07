/**
 * The colour scheme, picked from a menu (light, dark, system), and the skin when the page offers
 * several: the same control in every frame.
 */
import { For, Show, useColorScheme } from '@fluixi/core';
import type { ComponentChild } from '@fluixi/dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@fluixi-ui/dropdown-menu';
import { Button } from '@fluixi-ui/button';
import { useAppearance } from '@fluixi-ui/theme';
import { AppearanceDialog, appearanceDialogOpen, type AppearanceDialogLabels } from './appearance.js';
import { icons } from './icons.js';

export const SCHEMES = ['light', 'dark', 'system'] as const;
export type Scheme = (typeof SCHEMES)[number];

export interface ThemeToggleLabels {
  theme: string;
  schemes: Record<Scheme, string>;
  /** The skin section's title and each skin's name by its `data-ui` value. Left out, no skin section. */
  skins?: { title: string; names: Record<string, string> };
  /** The menu entry that opens the appearance dialog, and the dialog's words. Left out, no entry. */
  appearance?: { open: string; dialog: AppearanceDialogLabels };
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
  const dialog = appearanceDialogOpen;
  return (
    <>
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
          <Show when={props.labels.skins}>
            {(skins: NonNullable<ThemeToggleLabels['skins']>) => <SkinChoices labels={skins} />}
          </Show>
          <Show when={props.labels.appearance}>
            {(entry: NonNullable<ThemeToggleLabels['appearance']>) => (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => dialog.set(true)}>{entry.open}</DropdownMenuItem>
              </>
            )}
          </Show>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
    <Show when={props.labels.appearance}>
      {(entry: NonNullable<ThemeToggleLabels['appearance']>) => (
        <Button variant="outline" tone="neutral" size="sm" aria-label={entry.open} title={entry.open} onPress={() => dialog.set(true)}>
          <Icon path={icons.palette} />
        </Button>
      )}
    </Show>
    <Show when={props.labels.appearance}>
      {(entry: NonNullable<ThemeToggleLabels['appearance']>) => (
        <AppearanceDialog labels={entry.dialog} open={dialog()} onOpenChange={(open) => dialog.set(open)} />
      )}
    </Show>
    </>
  );
}

/** The skins the appearance provider offers; rendered only under one. */
function SkinChoices(props: { labels: NonNullable<ThemeToggleLabels['skins']> }): ComponentChild {
  const appearance = useAppearance();
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>{props.labels.title}</DropdownMenuLabel>
      <For each={[...appearance.skin.options]}>
        {(choice) => (
          <DropdownMenuRadioItem checked={appearance.skin.value() === choice} onSelect={() => appearance.skin.set(choice)}>
            {() => props.labels.names[choice] ?? choice}
          </DropdownMenuRadioItem>
        )}
      </For>
    </>
  );
}
