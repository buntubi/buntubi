/**
 * What the console checks before it adds to the catalogue: the provider's rules (idp
 * web/admin.py ScopeIn and Descriptions). Messages are i18n keys.
 */
import { z } from 'zod';

const consent = z.string().trim().min(1, 'form.required').max(200, 'form.tooLong');

export const scopeSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'form.required')
    .regex(/^[a-z][a-z0-9_.:-]{1,63}$/, 'form.scopeName'),
  sensitivity: z.enum(['public', 'sensitive', 'restricted']),
  resource: z.string().trim().max(64, 'form.tooLong'),
  fr: consent,
  en: consent,
});

export type ScopeInput = z.infer<typeof scopeSchema>;
