/** The colour scheme, cycled light, dark, system: the same control in every frame. */
import { useColorScheme } from '@fluixi/core';
import type { ComponentChild } from '@fluixi/dom';
import { Button } from '@fluixi-ui/button';
import { icons } from './icons.js';

export const SCHEMES = ['light', 'dark', 'system'] as const;
export type Scheme = (typeof SCHEMES)[number];

export interface ThemeToggleLabels {
  theme: string;
  schemes: Record<Scheme, string>;
}

export function ThemeToggle(props: { labels: ThemeToggleLabels }): ComponentChild {
  const scheme = useColorScheme();
  const next = (): Scheme => SCHEMES[(SCHEMES.indexOf(scheme.value() as Scheme) + 1) % SCHEMES.length]!;
  const icon = () => (scheme.value() === 'system' ? icons.monitor : scheme.value() === 'dark' ? icons.moon : icons.sun);
  return (
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
  );
}
