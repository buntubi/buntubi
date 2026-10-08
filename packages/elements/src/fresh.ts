/**
 * The freshest copy of something an element got through a prop and changed through a service.
 * A change answers with the new copy at once; the host's copy arrives a moment later, when its
 * data is fetched again. In between the element shows the answer, so a saved value never
 * flashes back to the old one, and as soon as the host passes anything new, that wins.
 */
import { signal } from '@fluixi/reactive/signal';

export function freshest<T>(fromHost: () => T): { current: () => T; adopt: (answer: T) => void } {
  const answered = signal<{ value: T; over: T } | null>(null);
  return {
    current: () => {
      const latest = answered();
      return latest && latest.over === fromHost() ? latest.value : fromHost();
    },
    adopt: (answer) => answered.set({ value: answer, over: fromHost() }),
  };
}
