/**
 * What the portal checks before it changes an organization's people: the provider's rules (idp
 * web/developer.py TestUserIn and MemberIn). Messages are i18n keys.
 */
import { z } from 'zod';

const email = z.string().trim().min(1, 'form.required').email('form.email');

export const testUserSchema = z.object({ email });

export const memberInviteSchema = z.object({
  email,
  role: z.enum(['owner', 'manager', 'developer', 'reviewer', 'viewer']),
});

export type TestUserInput = z.infer<typeof testUserSchema>;
export type MemberInviteInput = z.infer<typeof memberInviteSchema>;
