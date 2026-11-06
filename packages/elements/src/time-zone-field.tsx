/** A time zone picked from the browser's list of IANA names: a person's, an organization's. */
import { For } from '@fluixi/core';
import { FormField } from '@fluixi-ui/form';
import { Select, SelectContent, SelectItem, SelectPortal, SelectTrigger, SelectValue } from '@fluixi-ui/select';
import type { FieldControl } from './field.js';

export interface TimeZoneFieldProps {
  control: FieldControl<string>;
  label: string;
  description?: string;
  disabled?: boolean;
  /** Offers no zone at all, under this label: the value is then ''. */
  noneLabel?: string;
}

const zoneLabel = (zone: string) => zone.replaceAll('_', ' ');

export function TimeZoneField(props: TimeZoneFieldProps) {
  const label = () => props.label;
  const none = props.noneLabel;
  const options = [...(none === undefined ? [] : ['']), ...Intl.supportedValuesOf('timeZone')];
  const text = (value: string) => (value === '' ? (props.noneLabel ?? '') : zoneLabel(value));
  return (
    <FormField control={props.control} label={label} description={() => props.description ?? ''}>
      {(b) => (
        <Select value={b.value()} labels={text} disabled={props.disabled} onChange={(value: string) => b.onChange(value)}>
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
