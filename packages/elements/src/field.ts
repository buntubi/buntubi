/**
 * The control an element's typed form hands out. `setValue` marks a field touched, so its error
 * shows at once; `reset` clears it as if new, for a form that opens or empties after a save.
 */
import type { ReactiveControl } from '@fluixi-ui/form';

export interface FieldControl<T> extends ReactiveControl<T> {
  reset(value?: T): void;
  /** `pristine` keeps the field untouched: its error waits for the commit or the blur. */
  setValue(value: T, options?: { pristine?: boolean }): void;
}
