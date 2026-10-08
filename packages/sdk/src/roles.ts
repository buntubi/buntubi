/**
 * What each organization role may do, as the provider decides it (idp services/platform.py
 * ABILITIES). Pages use it to offer only what the provider would accept; the provider still
 * checks every call.
 */
import type { Role } from './types.js';

export type Ability =
  | 'read'
  | 'edit_apps'
  | 'test_users'
  | 'sandbox_keys'
  | 'live_keys'
  | 'publish'
  | 'members'
  | 'settings'
  | 'delete';

const MANAGER: Ability[] = ['read', 'edit_apps', 'test_users', 'sandbox_keys', 'live_keys', 'publish', 'members', 'settings'];

export const ABILITIES: Record<Role, ReadonlySet<Ability>> = {
  owner: new Set([...MANAGER, 'delete']),
  admin: new Set(MANAGER),
  developer: new Set(['read', 'edit_apps', 'test_users', 'sandbox_keys']),
  reviewer: new Set(['read']),
  viewer: new Set(['read']),
};

export function can(role: Role | null | undefined, ability: Ability): boolean {
  return !!role && ABILITIES[role].has(ability);
}
