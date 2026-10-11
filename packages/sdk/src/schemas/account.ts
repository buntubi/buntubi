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

export const passwordChangeSchema = z.object({
  current_password: z.string().min(1, 'form.required'),
  new_password: z.string().min(10, 'form.passwordShort').max(256, 'form.tooLong'),
  sign_out_others: z.boolean(),
});

/** A code from the authenticator app, or a backup code (ABCD-EFGH). */
export const twoStepCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^([0-9]{6}|[A-Za-z0-9]{4}-?[A-Za-z0-9]{4})$/, 'form.code'),
});

export const passkeyNameSchema = z.object({
  name: z.string().trim().min(1, 'form.required').max(64, 'form.tooLong'),
});

/** The password again, when a sign-in is too old to add a way in. */
export const reauthSchema = z.object({ password: z.string().min(1, 'form.required') });

/** Deleting the account: its address typed again, and the password when the sign-in is old. */
export const deleteAccountSchema = z.object({
  email: z.string().trim().min(1, 'form.required'),
  password: z.string(),
});

export type NameInput = z.infer<typeof nameSchema>;
export type PhoneInput = z.infer<typeof phoneSchema>;
export type CountryInput = z.infer<typeof countrySchema>;
export type EmailChangeInput = z.infer<typeof emailChangeSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type TwoStepCodeInput = z.infer<typeof twoStepCodeSchema>;
export type PasskeyNameInput = z.infer<typeof passkeyNameSchema>;
export type ReauthInput = z.infer<typeof reauthSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
