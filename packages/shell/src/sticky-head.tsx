/**
 * The top of a list page, a title and its search, kept in view while the list scrolls under it.
 * Sticks below the top bar, and writes its own height to `--idp-head` on the page so a table's
 * column headings can stick right under it.
 */
import { Stack } from '@fluixi-ui/layout';
import { createResizeObserver } from '@fluixi-ui/primitives/resize-observer';
import { onCleanup, signal } from '@fluixi/reactive/signal';
import type { ComponentChild } from '@fluixi/dom';

export function StickyHead(props: { children?: ComponentChild }) {
  const head = signal<HTMLElement | undefined>(undefined);
  createResizeObserver(head, (_, el) => (el.parentElement as HTMLElement | null)?.style.setProperty('--idp-head', `${(el as HTMLElement).offsetHeight}px`));
  onCleanup(() => head()?.parentElement?.style.removeProperty('--idp-head'));
  return (
    <Stack
      ref={(el: HTMLElement) => head.set(el)}
      gap={4}
      style="position: sticky; top: var(--idp-topbar, 0px); z-index: 2; margin: -12px 0; padding: 12px 0; background: var(--idp-bg);"
    >
      {props.children}
    </Stack>
  );
}
