/**
 * What the account area checks before it sends a change: the provider's rules (idp web/api.py
 * update_profile, services/profile.py). Messages are i18n keys.
 */
import { z } from 'zod';

const name = z.string().max(100, 'form.tooLong');

export const nameSchema = z.object({ given_name: name, family_name: name });

export const phoneSchema = z.object({
  phone: z
    .string()
    .transform((value) => value.replace(/\s/g, ''))
    .pipe(z.string().regex(/^(\+[1-9][0-9]{6,14})?$/, 'form.phone')),
});

export const countrySchema = z.object({ country: z.string().trim().regex(/^([A-Za-z]{2})?$/, 'form.country') });

export const emailChangeSchema = z.object({
  email: z.string().trim().min(1, 'form.required').email('form.email'),
  password: z.string().min(1, 'form.required'),
});

export type NameInput = z.infer<typeof nameSchema>;
export type PhoneInput = z.infer<typeof phoneSchema>;
export type CountryInput = z.infer<typeof countrySchema>;
export type EmailChangeInput = z.infer<typeof emailChangeSchema>;
