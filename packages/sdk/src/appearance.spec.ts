import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appearanceChanges, createAppearanceSync, type AppearanceChoices, type AppearanceState } from './appearance.js';

describe('appearanceChanges', () => {
  it('names the axes that differ, clears one that went, and leaves locked ones alone', () => {
    expect(appearanceChanges({ skin: 'soft', corner: 'round' }, { skin: 'glass' }, [])).toEqual({ skin: 'glass', corner: null });
    expect(appearanceChanges({ skin: 'soft' }, { skin: 'glass', corner: 'round' }, ['corner'])).toEqual({ skin: 'glass' });
    expect(appearanceChanges({ transparency: 0.5 }, { transparency: 0.5 }, [])).toEqual({});
  });
});

describe('createAppearanceSync', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const state = (appearance: AppearanceChoices, locked: AppearanceState['locked'] = []): AppearanceState => ({ appearance, own: appearance, locked });

  it('applies what the account holds without saving it back, then saves one request for a burst of changes', async () => {
    // The account holds one axis; the page has its own default for the others, which is not saved.
    let page: AppearanceChoices = { skin: 'soft', corner: 'default' };
    const save = vi.fn(async (changes: Record<string, unknown>) => state({ ...page, ...changes } as AppearanceChoices));
    const sync = createAppearanceSync({ load: async () => state({ skin: 'glass' }), save, read: () => page, apply: (choices) => (page = choices) });
    expect(await sync.start()).toBe(true);
    sync.changed();
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).not.toHaveBeenCalled();

    for (const opacity of [0.4, 0.45, 0.5]) {
      page = { ...page, transparency: opacity };
      sync.changed();
    }
    await vi.advanceTimersByTimeAsync(1000);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ transparency: 0.5 });
    sync.stop();
  });

  it('keeps going after a failed load or save', async () => {
    const errors: unknown[] = [];
    const page: AppearanceChoices = { skin: 'soft' };
    const failing = createAppearanceSync({ load: async () => Promise.reject(new Error('offline')), save: async () => state({}), read: () => page, apply: () => {}, onError: (e) => errors.push(e) });
    expect(await failing.start()).toBe(false);
    expect(errors).toHaveLength(1);

    let attempts = 0;
    let current: AppearanceChoices = { skin: 'soft' };
    const sync = createAppearanceSync({
      load: async () => state({ skin: 'soft' }),
      save: async () => {
        if (++attempts === 1) throw new Error('offline');
        return state({ skin: 'glass' });
      },
      read: () => current,
      apply: () => {},
      onError: (e) => errors.push(e),
    });
    await sync.start();
    current = { skin: 'glass' };
    sync.changed();
    await vi.advanceTimersByTimeAsync(1000);
    sync.changed();
    await vi.advanceTimersByTimeAsync(1000);
    expect(attempts).toBe(2);
  });
});
