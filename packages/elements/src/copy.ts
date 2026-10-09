/**
 * Copying a value to the clipboard, with a flag that reads true for a moment afterwards. The
 * timer goes with the scope that made it.
 */
import { onCleanup, signal, type SignalHandle } from '@fluixi/reactive/signal';

export function copier(): { copied: SignalHandle<boolean>; copy: (value: string) => void } {
  const copied = signal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(timer));
  return {
    copied,
    copy: (value) => {
      void navigator.clipboard?.writeText(value).then(() => {
        copied.set(true);
        clearTimeout(timer);
        timer = setTimeout(() => copied.set(false), 1500);
      });
    },
  };
}
