/**
 * Text for the keys these elements can show: validation keys from the host's schema and the
 * refusal codes the host's action throws. A host passes its translations through `messages`;
 * these English defaults fill any gap, and an unknown key is shown as is.
 */
export type Messages = Record<string, string>;

export const defaultMessages: Messages = {
  'form.required': 'This field is required.',
  'form.email': 'Enter a valid email address.',
  'form.passwordShort': 'The password needs at least 10 characters.',
  'form.code': 'Enter the 6-digit code.',
  'form.userCode': 'Enter the 8-character code shown on your device.',
  generic: 'Something went wrong. Try again.',
};

/** A reader over the host's messages, falling back to the defaults, then to the key itself. */
export function messageReader(host: () => Messages | undefined) {
  return (key: string): string => host()?.[key] ?? defaultMessages[key] ?? key;
}
