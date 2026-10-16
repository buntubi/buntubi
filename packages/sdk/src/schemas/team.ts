/**
 * What the portal checks before it changes an organization's people: the provider's rules (idp
 * web/developer.py TestUserIn and MemberIn). Messages are i18n keys.
 */
import { z } from 'zod';
import { POSITIONS } from '../roles.js';

const email = z.string().trim().min(1, 'form.required').email('form.email');

export const testUserSchema = z.object({ email });

export const memberInviteSchema = z.object({
  email,
  // A position: a role, or a portal role standing for a member holding it (see ../roles).
  role: z.enum(POSITIONS),
});

export type TestUserInput = z.infer<typeof testUserSchema>;
export type MemberInviteInput = z.infer<typeof memberInviteSchema>;
