/** Client-side checks, mirroring the server's. Messages are keys, worded in i18n.ts. */
import { z } from 'zod';

const email = z.email('form.email');
const newPassword = z.string().min(10, 'form.passwordShort').max(256, 'form.passwordShort');
const name = z.string().trim().min(1, 'form.required').max(100);

export const signInSchema = z.object({ email, password: z.string().min(1, 'form.required') });
export const signUpSchema = z.object({ givenName: name, familyName: name, email, password: newPassword });
export const forgotPasswordSchema = z.object({ email });
export const resetPasswordSchema = z.object({ password: newPassword, confirm: z.string() });
