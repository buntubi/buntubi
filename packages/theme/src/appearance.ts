/**
 * The platform's appearance: fluixi-ui's predefined skins, soft by default, each choice (skin,
 * light or dark, accent) kept in an `idp-*` cookie so the server renders it. The apps wrap their
 * root in `<AppearanceProvider {...appearance}>`; the shell's menu switches skins.
 */
import { fluixiSkin, type AppearanceProviderProps, type SkinDescriptor } from '@fluixi-ui/theme';
import { glassSkin } from '@fluixi-ui/skin-glass/skin';
import { materialSkin } from '@fluixi-ui/skin-material/skin';
import { paperSkin } from '@fluixi-ui/skin-paper/skin';
import { softSkin } from '@fluixi-ui/skin-soft/skin';
import { schemeKey } from './document.js';

/** Every skin the platform offers, its default first. */
export const SKINS: readonly SkinDescriptor[] = [softSkin, fluixiSkin, materialSkin, paperSkin, glassSkin];
export const DEFAULT_SKIN = softSkin.name;
/** The cookie holding the visitor's skin, read by the provider's sign-in pages too. */
export const SKIN_COOKIE = 'idp-skin';

/**
 * The sign-in pages' appearance: a client's own skin alone when it has one, else every skin with
 * the one the server drew (the reader's or the platform's) first.
 */
export function signInAppearance(clientSkin: string | undefined, drawn: string | undefined): Appearance {
  if (clientSkin) {
    const own = SKINS.find((skin) => skin.name === clientSkin) ?? { name: clientSkin };
    return { ...appearance, skins: [own], defaultSkin: own.name };
  }
  return { ...appearance, defaultSkin: drawn ?? DEFAULT_SKIN };
}

type Appearance = Omit<AppearanceProviderProps, 'children'> & { skins: readonly SkinDescriptor[] };

export const appearance: Appearance = {
  skins: SKINS,
  defaultSkin: DEFAULT_SKIN,
  storagePrefix: 'idp',
  // Cards are glass under the glass skin, so the choice of transparency and backdrop shows on them.
  defaultCards: 'glass',
  colorScheme: { storageKey: schemeKey, themeColor: { light: '#f7f7f8', dark: '#0a0b0d' } },
};
