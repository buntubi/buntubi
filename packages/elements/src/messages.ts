/**
 * Text for the validation keys the schemas in `@idp/sdk/schemas` use. A host passes its own
 * translations through an element's `messages` prop; these English defaults fill any gap, and a
 * key nobody knows is shown as is.
 */
export type Messages = Record<string, string>;

export const defaultMessages: Messages = {
  'form.required': 'This field is required.',
  'form.email': 'Enter a valid email address.',
  'form.tooLong': 'This is too long.',
  'form.passwordShort': 'The password needs at least 10 characters.',
  'form.country': 'Two letters, such as SN or FR.',
  'form.phone': 'International format, such as +221771234567.',
};

/** A reader over the host's messages, falling back to the defaults, then to the key itself. */
export function messageReader(host: () => Messages | undefined) {
  return (key: string): string => host()?.[key] ?? defaultMessages[key] ?? key;
}
