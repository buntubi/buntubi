/**
 * A person's appearance as the provider keeps it on their account, and the sync an app runs so the
 * choices follow them: it loads them when the page opens, applies them, and saves what changes
 * after a short wait, only the axes that differ. The app wires its own controls (fluixi-ui's
 * `useAppearance()`) to `read` and `apply`; nothing here depends on a UI library.
 */

export const APPEARANCE_AXES = ['skin', 'scheme', 'accent', 'corner', 'transparency', 'backdrop'] as const;
export type AppearanceAxis = (typeof APPEARANCE_AXES)[number];

/** One value per axis; an axis left out is the deployment's default. */
export interface AppearanceChoices {
  skin?: string;
  scheme?: 'system' | 'light' | 'dark';
  accent?: string;
  corner?: 'default' | 'round';
  /** A preset (solid, medium, liquid, ultra) or an exact opacity from 0.2 to 1. */
  transparency?: string | number;
  backdrop?: string;
}

/** What the provider answers: what applies, the person's own choices, and the locked axes. */
export interface AppearanceState {
  appearance: AppearanceChoices;
  own: AppearanceChoices;
  locked: AppearanceAxis[];
}

/** The axes where `next` differs from `from`, as a request body: a missing one is null (cleared). */
export function appearanceChanges(from: AppearanceChoices, next: AppearanceChoices, locked: readonly AppearanceAxis[] = []): Partial<Record<AppearanceAxis, unknown>> {
  const changes: Partial<Record<AppearanceAxis, unknown>> = {};
  for (const axis of APPEARANCE_AXES) {
    if (locked.includes(axis) || from[axis] === next[axis]) continue;
    changes[axis] = next[axis] ?? null;
  }
  return changes;
}

export interface AppearanceSyncOptions {
  load: () => Promise<AppearanceState>;
  save: (changes: Partial<Record<AppearanceAxis, unknown>>) => Promise<AppearanceState>;
  /** The choices in force on the page now. */
  read: () => AppearanceChoices;
  /** Puts the person's choices on the page. */
  apply: (choices: AppearanceChoices) => void;
  /** How long after the last change it saves. Default 600 ms. */
  waitMs?: number;
  /** An error in the background, for the app to log; a failed save is tried again at the next change. */
  onError?: (error: unknown) => void;
}

export interface AppearanceSync {
  /** Loads the person's choices and applies them; false when they could not be loaded. */
  start(): Promise<boolean>;
  /** The page's choices changed: saves them after the wait. */
  changed(): void;
  /** The axes the deployment locks, once loaded. */
  locked(): readonly AppearanceAxis[];
  stop(): void;
}

export function createAppearanceSync(options: AppearanceSyncOptions): AppearanceSync {
  let saved: AppearanceChoices = {};
  let locked: readonly AppearanceAxis[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;

  const flush = async () => {
    timer = undefined;
    const changes = appearanceChanges(saved, options.read(), locked);
    if (Object.keys(changes).length === 0) return;
    try {
      const state = await options.save(changes);
      saved = state.appearance;
      locked = state.locked;
    } catch (error) {
      options.onError?.(error);
    }
  };

  return {
    async start() {
      try {
        const state = await options.load();
        if (stopped) return false;
        locked = state.locked;
        options.apply(state.appearance);
        // What the page shows once the account's choices are on it, defaults included: only a
        // person's own change from here is saved, never the look they merely started with.
        saved = options.read();
        return true;
      } catch (error) {
        options.onError?.(error);
        return false;
      }
    },
    changed() {
      if (stopped) return;
      clearTimeout(timer);
      timer = setTimeout(() => void flush(), options.waitMs ?? 600);
    },
    locked: () => locked,
    stop() {
      stopped = true;
      clearTimeout(timer);
    },
  };
}

/** A refusal from the provider's appearance API: `code` is its error (`corner_locked`, `invalid_skin`, ...). */
export class AppearanceApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`the identity provider answered ${status} ${code}`);
    this.name = 'AppearanceApiError';
  }
}

/** The provider's `/v1/appearance`, for a first-party app acting for the signed-in person (scope `appearance`). */
export function appearanceClient(options: { issuer: string; accessToken: () => string; fetch?: typeof fetch }) {
  const call = async (method: 'GET' | 'PATCH', body?: unknown): Promise<AppearanceState> => {
    const response = await (options.fetch ?? fetch)(new URL('/v1/appearance', options.issuer), {
      method,
      headers: { authorization: `Bearer ${options.accessToken()}`, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      const failure = (await response.json().catch(() => ({}))) as { error?: string };
      throw new AppearanceApiError(response.status, failure.error ?? 'error');
    }
    return (await response.json()) as AppearanceState;
  };
  return {
    get: () => call('GET'),
    update: (changes: Partial<Record<AppearanceAxis, unknown>>) => call('PATCH', changes),
  };
}
