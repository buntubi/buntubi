/** The platform's brand, loaded once by an app's root layout and read by every frame below it. */
import { createContext, useContext } from '@fluixi/core';
import type { Brand } from '@buntu/sdk/types';

export const BrandContext = createContext<() => Brand>(() => ({}));

export function useBrand(): () => Brand {
  return useContext(BrandContext);
}

/** One letter for a mark, from a name. */
export function markOf(name: string | undefined): string {
  return (name ?? '').trim().slice(0, 1).toUpperCase();
}
