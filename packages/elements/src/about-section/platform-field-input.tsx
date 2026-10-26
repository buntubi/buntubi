/**
 * One of the platform's own profile fields, drawn by its type: the same on the sign-up form, the
 * step that asks for a missing field, and in the account area. A form keeps each value in the
 * shape its control edits (text for numbers too); `platformValueOut` turns it into what the
 * provider stores.
 */
import { For } from '@fluixi/core';
import { createField, createForm, type Validator } from '@fluixi/forms';
import { FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { Switch } from '@fluixi-ui/switch';
import { Checkbox } from '@fluixi-ui/checkbox';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@fluixi-ui/select';
import type { PlatformField, PlatformValue } from '@buntubi/sdk/account';
import type { FieldControl } from '../field.js';

/** A form's value for a field: text (numbers too), a yes or no, or the choices ticked. */
export type PlatformFormValue = string | boolean | string[];

/** The text of a label in `locale`, English when it has none. */
export const labelIn = (label: { fr: string; en: string }, locale: string) => (locale === 'fr' ? label.fr : label.en) || label.en;

/** The form's starting value for a field, from what the provider stored. */
export function platformValueIn(field: PlatformField, stored: PlatformValue | undefined): PlatformFormValue {
  if (field.type === 'boolean') return stored === true;
  if (field.type === 'choices') return Array.isArray(stored) ? stored : [];
  return stored === undefined || stored === null ? '' : String(stored);
}

/** What the provider stores for a form value; null clears it. A number that does not parse is sent as typed, for the provider to refuse. */
export function platformValueOut(field: PlatformField, value: PlatformFormValue): PlatformValue | null {
  if (field.type === 'boolean') return value === true;
  if (field.type === 'choices') return Array.isArray(value) && value.length ? value : null;
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return null;
  if (field.type === 'number') return Number.isFinite(Number(text)) ? Number(text) : text;
  return text;
}

/** Refuses an empty required field (`message` worded by the page). A yes or no is never empty. */
export const platformRequired =
  (field: () => PlatformField | undefined, message: () => string): Validator<PlatformFormValue> =>
  (value) => {
    const current = field();
    if (!current || current.mode !== 'required' || current.type === 'boolean') return null;
    return platformValueOut(current, value) === null ? { type: 'required', message: message() } : null;
  };

export interface PlatformFieldInputProps {
  field: PlatformField;
  control: FieldControl<PlatformFormValue>;
  locale: string;
  description?: string;
}

export function PlatformFieldInput(props: PlatformFieldInputProps) {
  const field = props.field;
  const label = () => labelIn(field.label, props.locale);
  const description = () => props.description ?? '';
  const choiceLabel = (value: string) => {
    const choice = field.choices.find((c) => c.value === value);
    return choice ? labelIn(choice.label, props.locale) : value;
  };
  if (field.type === 'boolean') {
    return (
      <FormField control={props.control} label={label} description={description}>
        {(b) => <Switch aria-label={label()} checked={b.value() === true} onChange={(on: boolean) => b.onChange(on)} />}
      </FormField>
    );
  }
  if (field.type === 'choice') {
    return (
      <FormField control={props.control} label={label} description={description}>
        {(b) => (
          <Select value={String(b.value())} labels={choiceLabel} onChange={(value: string) => b.onChange(value)}>
            <SelectTrigger aria-label={label}>
              <SelectValue />
            </SelectTrigger>
            <SelectPortal>
              <SelectContent>
                <For each={field.choices}>{(choice) => <SelectItem value={choice.value}>{choiceLabel(choice.value)}</SelectItem>}</For>
              </SelectContent>
            </SelectPortal>
          </Select>
        )}
      </FormField>
    );
  }
  if (field.type === 'choices') {
    return (
      <FormField control={props.control} label={label} description={description}>
        {(b) => {
          const ticked = () => (Array.isArray(b.value()) ? (b.value() as string[]) : []);
          const toggle = (value: string, on: boolean) =>
            b.onChange(field.choices.map((c) => c.value).filter((v) => (v === value ? on : ticked().includes(v))));
          return (
            <span class="idp-choices" role="group" aria-label={label()}>
              <For each={field.choices}>
                {(choice) => (
                  <label class="idp-choice">
                    <Checkbox checked={ticked().includes(choice.value)} onChange={(on) => toggle(choice.value, on === true)} />
                    {choiceLabel(choice.value)}
                  </label>
                )}
              </For>
            </span>
          );
        }}
      </FormField>
    );
  }
  return (
    <FormField control={props.control} label={label} description={description}>
      {(b) => (
        <Input
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
          inputmode={field.type === 'number' ? 'decimal' : undefined}
          name={field.key}
          value={String(b.value())}
          onInput={b.onInput}
          onBlur={b.onBlur}
        />
      )}
    </FormField>
  );
}

/** A form for the platform's fields, starting from what the provider stored. */
export function platformForm(fields: PlatformField[], stored: Record<string, PlatformValue>, required: () => string) {
  return createForm(
    Object.fromEntries(
      fields.map((field) => [
        field.key,
        createField<PlatformFormValue>(platformValueIn(field, stored[field.key]), {
          validators: [platformRequired(() => field, required)],
        }),
      ]),
    ),
  );
}

export type PlatformForm = ReturnType<typeof platformForm>;

/**
 * The values to send for `form`, checked as a submit would (the errors show on the fields), or
 * null when one is refused. Called from the page's own submit, which owns the other fields.
 */
export function platformValuesOf(form: PlatformForm, fields: PlatformField[]): Promise<Record<string, PlatformValue | null> | null> {
  return new Promise((resolve) => {
    let valid = false;
    const done = form.submit((values: Record<string, PlatformFormValue>) => {
      valid = true;
      resolve(Object.fromEntries(fields.map((field) => [field.key, platformValueOut(field, values[field.key] ?? '')])));
    });
    void Promise.resolve(done).then(() => {
      if (!valid) resolve(null);
    });
  });
}
