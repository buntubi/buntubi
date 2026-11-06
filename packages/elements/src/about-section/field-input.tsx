/** One profile field's input, the same on the sign-up form and in the account area. */
import { For } from '@fluixi/core';
import { FormField } from '@fluixi-ui/form';
import { Input } from '@fluixi-ui/input';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@fluixi-ui/select';
import { GENDERS, type Gender, type ProfileField } from '@buntubi/sdk/account';
import type { FieldControl } from '../field.js';
import { TimeZoneField } from '../time-zone-field.js';

const AUTOCOMPLETE: Record<ProfileField, string> = {
  birthdate: 'bday',
  gender: 'sex',
  middle_name: 'additional-name',
  nickname: 'nickname',
  website: 'url',
  zoneinfo: 'off',
};

export interface ProfileFieldInputProps {
  field: ProfileField;
  control: FieldControl<string>;
  label: string;
  description?: string;
  genders: Record<Gender, string>;
  /** Offered as a choice to empty an optional field; left out, the field cannot be emptied. */
  noneLabel?: string;
}

export function ProfileFieldInput(props: ProfileFieldInputProps) {
  const field = props.field;
  const label = () => props.label;
  const description = () => props.description ?? '';
  if (field === 'zoneinfo') return <TimeZoneField control={props.control} label={props.label} description={props.description} noneLabel={props.noneLabel} />;
  if (field === 'gender') {
    const options = [...GENDERS];
    const text = (value: string) => props.genders[value as Gender] ?? '';
    return (
      <FormField control={props.control} label={label} description={description}>
        {(b) => (
          <Select value={b.value()} labels={text} onChange={(value: string) => b.onChange(value)}>
            <SelectTrigger aria-label={label}>
              <SelectValue />
            </SelectTrigger>
            <SelectPortal>
              <SelectContent>
                <For each={options}>{(option) => <SelectItem value={option}>{() => text(option)}</SelectItem>}</For>
              </SelectContent>
            </SelectPortal>
          </Select>
        )}
      </FormField>
    );
  }
  return (
    <FormField control={props.control} label={label} description={description}>
      {(b) => (
        <Input
          type={field === 'birthdate' ? 'date' : field === 'website' ? 'url' : 'text'}
          name={field}
          autocomplete={AUTOCOMPLETE[field]}
          value={b.value()}
          onInput={b.onInput}
          onBlur={b.onBlur}
        />
      )}
    </FormField>
  );
}
