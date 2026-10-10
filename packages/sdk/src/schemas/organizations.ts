/**
 * What the portal checks before it sends an organization to the developer API: the provider's
 * rules (idp web/developer.py OrganizationIn and OrganizationPatch). Messages are i18n keys.
 */
import { z } from 'zod';

/** Empty, or a valid address. */
const optionalEmail = z.string().trim().refine((value) => value === '' || z.email().safeParse(value).success, 'form.email');

export const organizationSchema = z.object({
  name: z.string().trim().min(1, 'form.required').max(80, 'form.tooLong'),
  description: z.string().max(500, 'form.tooLong'),
  support_email: optionalEmail,
});

export type OrganizationInput = z.infer<typeof organizationSchema>;

/** Why the console suspends an organization (idp web/admin.py SuspendIn); its owners read it. */
export const suspendSchema = z.object({
  reason: z.string().trim().min(1, 'form.required').max(500, 'form.tooLong'),
});

export type SuspendInput = z.infer<typeof suspendSchema>;
