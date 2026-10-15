/**
 * What each organization role, and the developer portal's own role beside it, may do in the
 * portal, as the provider decides it (idp services/platform.py ROLE_ABILITIES and
 * PORTAL_ABILITIES). Pages use it to offer only what the provider would accept; the provider still
 * checks every call.
 */
import type { PortalRole, Role } from './types.js';

export type Ability =
  | 'read'
  | 'edit_apps'
  | 'test_users'
  | 'sandbox_keys'
  | 'live_keys'
  | 'publish'
  | 'members'
  | 'settings'
  | 'billing'
  | 'delete';

const ADMIN: Ability[] = ['read', 'edit_apps', 'test_users', 'sandbox_keys', 'live_keys', 'publish', 'members', 'settings', 'billing'];

export const ROLE_ABILITIES: Record<Role, ReadonlySet<Ability>> = {
  owner: new Set([...ADMIN, 'delete']),
  admin: new Set(ADMIN),
  billing: new Set(['read', 'billing']),
  member: new Set(['read']),
  // Let into part of the organization by a product, never into the portal.
  guest: new Set(),
};

export const PORTAL_ABILITIES: Record<PortalRole, ReadonlySet<Ability>> = {
  developer: new Set(['read', 'edit_apps', 'test_users', 'sandbox_keys']),
  reviewer: new Set(['read']),
  viewer: new Set(['read']),
};

/** Someone's place in an organization: their role, and the portal role a member may hold. */
export interface Membership {
  role?: Role | null;
  portal_role?: PortalRole | null;
}

export function can(membership: Membership | null | undefined, ability: Ability): boolean {
  if (!membership?.role) return false;
  const portal = membership.portal_role ? PORTAL_ABILITIES[membership.portal_role] : undefined;
  return ROLE_ABILITIES[membership.role].has(ability) || !!portal?.has(ability);
}

/**
 * One choice in the portal's team screens, standing for a role and a portal role: a portal role
 * stands for a member holding it.
 */
export type Position = Role | PortalRole;

export const POSITIONS: Position[] = ['owner', 'admin', 'billing', 'developer', 'reviewer', 'viewer', 'member', 'guest'];

const PORTAL_ROLES: PortalRole[] = ['developer', 'reviewer', 'viewer'];

/** The position a membership shows as. */
export const positionOf = (membership: Membership): Position =>
  membership.role === 'member' && membership.portal_role ? membership.portal_role : (membership.role ?? 'member');

/** The role and portal role a position stands for. */
export const rolesOf = (position: Position): { role: Role; portal_role: PortalRole | null } =>
  (PORTAL_ROLES as string[]).includes(position)
    ? { role: 'member', portal_role: position as PortalRole }
    : { role: position as Role, portal_role: null };

/** Positions whose access can be limited to some apps: owners and admins always see every app. */
export const LIMITABLE: Position[] = ['developer', 'reviewer', 'viewer'];
