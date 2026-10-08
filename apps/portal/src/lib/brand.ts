/** The platform's brand, loaded once by the root layout and read by every frame below it. */
import { createContext, useContext } from '@fluixi/core';
import type { Brand } from './types.js';

export const BrandContext = createContext<() => Brand>(() => ({}));

export function useBrand(): () => Brand {
  return useContext(BrandContext);
}

/** One letter or two for the brand's mark, from its name. */
export function markOf(name: string | undefined): string {
  return (name ?? '').trim().slice(0, 1).toUpperCase();
}
