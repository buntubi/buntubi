/**
 * What the console checks before it sends an account to the admin API: the same rules the
 * provider applies (idp web/admin.py UserIn and UserPatch). Messages are i18n keys.
 */
import { z } from 'zod';

const name = z.string().max(100, 'form.tooLong');

export const newUserSchema = z.object({
  email: z.string().trim().min(1, 'form.required').email('form.email'),
  given_name: name,
  family_name: name,
  locale: z.enum(['fr', 'en']),
  // The provider also refuses a password found in known breaches; it says so after submit.
  password: z.string().min(10, 'form.passwordShort').max(256, 'form.tooLong'),
});

export const userEditSchema = z.object({
  given_name: name,
  family_name: name,
  locale: z.enum(['fr', 'en']),
  // Empty clears it.
  country: z.string().trim().regex(/^([A-Za-z]{2})?$/, 'form.country'),
  phone: z
    .string()
    .transform((value) => value.replace(/\s/g, ''))
    .pipe(z.string().regex(/^(\+[1-9][0-9]{6,14})?$/, 'form.phone')),
});

export type NewUserInput = z.infer<typeof newUserSchema>;
export type UserEditInput = z.infer<typeof userEditSchema>;
