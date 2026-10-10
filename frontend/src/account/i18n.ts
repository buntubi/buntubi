/** The account area's words, French and English together. */
import type { Locale } from '../host/config.js';

const fr = {
  product: 'Compte',
  nav: { home: 'Accueil', info: 'Informations personnelles', security: 'Sécurité', devices: 'Appareils', apps: 'Applications connectées', data: 'Données et compte' },
  sidebar: { collapse: 'Réduire le menu', expand: 'Déplier le menu', search: 'Rechercher', navigation: 'Navigation' },
  shell: { theme: 'Thème', schemes: { light: 'Clair', dark: 'Sombre', system: 'Système' }, navigation: 'Fil d’Ariane', language: 'English', signOut: 'Se déconnecter', account: 'Compte' },
  switcher: {
    menu: 'Comptes',
    signedInHere: 'Connectés sur ce navigateur',
    current: 'Actuel',
    switchTo: 'Basculer',
    signOutOf: 'Déconnecter {email}',
    addAccount: 'Ajouter un compte',
    signOutAll: 'Déconnecter tous les comptes',
    error: 'Une erreur est survenue. Réessayez.',
  },
  hello: { welcome: 'Bonjour, {name}', since: 'Membre depuis {date}', edit: 'Modifier mes informations' },
  check: {
    title: 'Vérification du compte',
    progress: '{done} sur {total} faits.',
    allDone: 'Tout est en ordre.',
    left: 'Il reste à faire pour garder le compte sûr.',
    emailVerified: 'Adresse e-mail vérifiée',
    emailUnverified: 'Adresse e-mail à vérifier',
    twoStepOn: 'Validation en deux étapes activée',
    twoStepOnNote: 'Un code de votre téléphone après le mot de passe',
    twoStepOff: 'Validation en deux étapes désactivée',
    twoStepOffNote: 'Ajoutez un code de votre téléphone : un mot de passe volé ne suffira plus.',
    turnOn: 'Activer',
    codesLow: 'Plus que {n} codes de secours',
    codesLowNote: 'Ils vous font entrer si vous perdez votre téléphone. Créez-en une nouvelle série.',
    codesOk: '{n} codes de secours',
    codesOkNote: 'Gardez-les en lieu sûr',
    newCodes: 'Nouveaux codes',
  },
  areas: {
    security: { title: 'Sécurité', note: 'Mot de passe, validation en deux étapes et activité récente', link: 'Voir la sécurité' },
  },
  apps: 'Vos applications',
  security: { title: 'Sécurité', intro: 'Comment vous vous connectez, et ce qui s’est passé récemment sur votre compte.', twoStep: 'Validation en deux étapes' },
  loading: 'Chargement',
};

type Words = typeof fr;

const en: Words = {
  product: 'Account',
  nav: { home: 'Home', info: 'Personal info', security: 'Security', devices: 'Devices', apps: 'Connected apps', data: 'Data and account' },
  sidebar: { collapse: 'Collapse menu', expand: 'Expand menu', search: 'Search', navigation: 'Navigation' },
  shell: { theme: 'Theme', schemes: { light: 'Light', dark: 'Dark', system: 'System' }, navigation: 'Breadcrumb', language: 'Français', signOut: 'Sign out', account: 'Account' },
  switcher: {
    menu: 'Accounts',
    signedInHere: 'Signed in on this browser',
    current: 'Current',
    switchTo: 'Switch',
    signOutOf: 'Sign out of {email}',
    addAccount: 'Add another account',
    signOutAll: 'Sign out of all accounts',
    error: 'Something went wrong. Try again.',
  },
  hello: { welcome: 'Welcome, {name}', since: 'Member since {date}', edit: 'Edit personal info' },
  check: {
    title: 'Account check',
    progress: '{done} of {total} done.',
    allDone: 'All set.',
    left: 'Something to do to keep the account safe.',
    emailVerified: 'Email address verified',
    emailUnverified: 'Email address not verified',
    twoStepOn: 'Two-step sign-in is on',
    twoStepOnNote: 'A code from your phone after your password',
    twoStepOff: 'Two-step sign-in is off',
    twoStepOffNote: 'Add a code from your phone: a stolen password is no longer enough.',
    turnOn: 'Turn on',
    codesLow: 'Only {n} backup codes left',
    codesLowNote: 'They get you in if you lose your phone. Make a fresh set.',
    codesOk: '{n} backup codes',
    codesOkNote: 'Keep them somewhere safe',
    newCodes: 'New backup codes',
  },
  areas: {
    security: { title: 'Security', note: 'Password, two-step sign-in and recent activity', link: 'Review security' },
  },
  apps: 'Your apps',
  security: { title: 'Security', intro: 'How you sign in, and what happened on your account lately.', twoStep: 'Two-step sign-in' },
  loading: 'Loading',
};

export type AccountWords = Words;
export const accountWords: Record<Locale, Words> = { fr, en };
