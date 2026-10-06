/**
 * Field validators from the schema the host passes. Its messages are keys; `text` turns a key
 * into what the element shows. Both are read on every run, so a new `schema` or `messages`
 * applies to the next validation. Without a schema a field is not checked here, and the host's
 * action still refuses what it must.
 */
import { standardValidator, type StandardSchema, type Validator } from '@fluixi/forms';

/** An object schema whose fields the form checks one by one: Zod 4, Valibot, any Standard Schema. */
export interface FormSchema<T> {
  shape: { [K in keyof T]?: StandardSchema<unknown, T[K]> };
}

export function fieldValidator<T, K extends keyof T & string>(
  schema: () => FormSchema<T> | undefined,
  field: K,
  text: (key: string) => string,
): Validator<T[K]> {
  // One adapter per field schema: the host may swap the schema, a render does not.
  const adapters = new WeakMap<StandardSchema<unknown, T[K]>, Validator<T[K]>>();
  return (value, ctx) => {
    const fieldSchema = schema()?.shape[field];
    if (!fieldSchema) return null;
    let validate = adapters.get(fieldSchema);
    if (!validate) {
      validate = standardValidator(fieldSchema);
      adapters.set(fieldSchema, validate);
    }
    const error = validate(value, ctx);
    return error && { ...error, message: text(error.message ?? 'form.required') };
  };
}
