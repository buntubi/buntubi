/** Every word the pages and elements show, in French and English. */
import type { SignInLabels } from '../elements/sign-in/sign-in.js';
import type { SignUpLabels } from '../elements/sign-up/sign-up.js';
import type { VerifyEmailLabels } from '../elements/verify-email/verify-email.js';
import type { ForgotPasswordLabels } from '../elements/forgot-password/forgot-password.js';
import type { ResetPasswordLabels } from '../elements/reset-password/reset-password.js';
import type { ConsentLabels } from '../elements/consent/consent.js';
import type { AccountSelectLabels } from '../elements/account-select/account-select.js';
import type { AppLinksLabels } from '../elements/app-links/app-links.js';
import type { DeviceActivateLabels } from '../elements/device-activate/device-activate.js';
import type { MfaVerifyLabels } from '../elements/mfa-verify/mfa-verify.js';
import type { MfaSetupLabels } from '../elements/mfa-setup/mfa-setup.js';
import type { Messages } from '../elements/shared/messages.js';
import type { Locale } from './config.js';

export interface Text {
  titles: {
    signIn: string;
    signUp: string;
    verifyEmail: string;
    forgotPassword: string;
    resetPassword: string;
    consent: string;
    accounts: string;
    account: string;
    device: string;
    deviceDone: string;
    deviceRefused: string;
    signedOut: string;
    blocked: string;
    mfa: string;
    twoStep: string;
    yourApps: string;
  };
  /** One line under some titles, keyed like `titles`. */
  subtitles: Partial<Record<keyof Text['titles'], string>>;
  hero: { title: string; text: string };
  links: {
    noAccount: string;
    signUp: string;
    haveAccount: string;
    signIn: string;
    backToSignIn: string;
    switchAccount: string;
    signOut: string;
    language: string;
  };
  notes: {
    deviceDone: string;
    deviceRefused: string;
    signedOut: string;
    signedInAs: string;
    blocked: string;
    blockedContact: string;
    unverified: string;
    privacy: string;
    terms: string;
    homepage: string;
  };
  signIn: SignInLabels;
  signUp: SignUpLabels;
  verifyEmail: VerifyEmailLabels;
  forgotPassword: ForgotPasswordLabels;
  resetPassword: ResetPasswordLabels;
  consent: ConsentLabels;
  accountSelect: AccountSelectLabels;
  appLinks: AppLinksLabels;
  deviceActivate: DeviceActivateLabels;
  mfaVerify: MfaVerifyLabels;
  mfaSetup: MfaSetupLabels;
  scopes: Record<string, string>;
  messages: Messages;
}

const fr: Text = {
  titles: {
    signIn: 'Connexion',
    signUp: 'Créer un compte',
    verifyEmail: 'Vérifiez votre adresse e-mail',
    forgotPassword: 'Mot de passe oublié',
    resetPassword: 'Nouveau mot de passe',
    consent: 'Autoriser l’accès',
    accounts: 'Choisir un compte',
    account: 'Votre compte',
    device: 'Connecter un appareil',
    deviceDone: 'Appareil connecté',
    deviceRefused: 'Connexion refusée',
    signedOut: 'Vous êtes déconnecté',
    blocked: 'Accès bloqué',
    mfa: 'Validation en deux étapes',
    twoStep: 'Validation en deux étapes',
    yourApps: 'Vos applications',
  },
  subtitles: {
    signIn: 'Ravi de vous revoir. Connectez-vous pour continuer.',
    signUp: 'Quelques secondes suffisent.',
    resetPassword: 'Choisissez un mot de passe que vous n’utilisez nulle part ailleurs.',
    accounts: 'Avec quel compte voulez-vous continuer ?',
  },
  hero: {
    title: 'Un seul compte pour toutes vos applications.',
    text: 'Connectez-vous une fois, retrouvez vos outils partout, en sécurité.',
  },
  links: {
    noAccount: 'Pas encore de compte ?',
    signUp: 'Créer un compte',
    haveAccount: 'Déjà un compte ?',
    signIn: 'Se connecter',
    backToSignIn: 'Retour à la connexion',
    switchAccount: 'Changer de compte',
    signOut: 'Se déconnecter',
    language: 'English',
  },
  notes: {
    deviceDone: 'Vous pouvez fermer cette page et revenir sur votre appareil.',
    deviceRefused: 'L’appareil n’a pas été connecté.',
    signedOut: 'Votre session est terminée sur ce navigateur.',
    signedInAs: 'Connecté en tant que',
    blocked: 'Cette application est encore en développement : seules les personnes que son développeur a ajoutées peuvent s’y connecter.',
    blockedContact: 'Pour y accéder, écrivez à',
    unverified: 'Cette application n’a pas encore été vérifiée. Ne continuez que si vous connaissez son développeur.',
    privacy: 'Confidentialité',
    terms: 'Conditions',
    homepage: 'Site',
  },
  signIn: {
    email: 'Adresse e-mail',
    password: 'Mot de passe',
    forgot: 'Mot de passe oublié ?',
    submit: 'Se connecter',
    pending: 'Connexion',
  },
  signUp: {
    givenName: 'Prénom',
    familyName: 'Nom',
    email: 'Adresse e-mail',
    password: 'Mot de passe',
    passwordHint: 'Au moins 10 caractères.',
    submit: 'Créer mon compte',
    pending: 'Création',
  },
  verifyEmail: {
    sentTo: 'Nous avons envoyé un code à 6 chiffres à',
    code: 'Code de vérification',
    submit: 'Vérifier',
    pending: 'Vérification',
    resend: 'Envoyer un nouveau code',
    resent: 'Un nouveau code est en route.',
  },
  forgotPassword: {
    intro: 'Saisissez votre adresse e-mail, nous vous enverrons un lien pour choisir un nouveau mot de passe.',
    email: 'Adresse e-mail',
    submit: 'Envoyer le lien',
    pending: 'Envoi',
    sent: 'Si un compte utilise cette adresse, un lien de réinitialisation est en route. Consultez votre boîte de réception.',
  },
  resetPassword: {
    password: 'Nouveau mot de passe',
    passwordHint: 'Au moins 10 caractères.',
    confirm: 'Confirmez le nouveau mot de passe',
    mismatch: 'Les deux mots de passe diffèrent.',
    submit: 'Enregistrer',
    pending: 'Enregistrement',
  },
  consent: {
    wants: 'souhaite :',
    signedInAs: 'Connecté en tant que',
    approve: 'Autoriser',
    deny: 'Annuler',
    pending: 'Un instant',
  },
  accountSelect: { other: 'Utiliser un autre compte' },
  appLinks: { open: 'Ouvrir' },
  mfaVerify: {
    intro: 'Saisissez le code à 6 chiffres affiché par votre application d’authentification.',
    backupIntro: 'Saisissez l’un des codes de secours que vous avez enregistrés. Chacun ne sert qu’une fois.',
    code: 'Code d’authentification',
    backupCode: 'Code de secours',
    submit: 'Continuer',
    pending: 'Vérification',
    useBackup: 'Utiliser un code de secours',
    useApp: 'Utiliser l’application',
  },
  mfaSetup: {
    off: 'Ajoutez une deuxième étape à votre connexion : un code donné par une application d’authentification sur votre téléphone.',
    start: 'Activer la validation en deux étapes',
    scan: 'Scannez ce code avec votre application d’authentification, puis saisissez le code à 6 chiffres qu’elle affiche.',
    manual: 'Ou saisissez cette clé dans l’application :',
    code: 'Code de l’application',
    confirm: 'Activer',
    cancel: 'Annuler',
    saveCodes: 'Gardez ces codes de secours en lieu sûr. Chacun vous connecte une fois si vous perdez votre téléphone. Ils ne seront plus affichés.',
    copy: 'Copier les codes',
    copied: 'Copiés',
    done: 'Je les ai enregistrés',
    on: 'La validation en deux étapes est activée.',
    codesLeft: 'Codes de secours restants :',
    renew: 'Nouveaux codes',
    disable: 'Désactiver',
    confirmWithCode: 'Saisissez un code de l’application pour confirmer.',
    pending: 'Un instant',
  },
  deviceActivate: {
    intro: 'Saisissez le code affiché sur votre appareil. N’autorisez qu’un appareil que vous utilisez en ce moment.',
    code: 'Code de l’appareil',
    approve: 'Autoriser',
    deny: 'Refuser',
    pending: 'Un instant',
  },
  scopes: {
    openid: 'Vous identifier',
    profile: 'Voir votre nom et votre photo',
    email: 'Voir votre adresse e-mail',
    phone: 'Voir votre numéro de téléphone',
    offline_access: 'Rester connecté quand vous n’utilisez pas l’application',
    admin: 'Administrer le fournisseur d’identité',
  },
  messages: {
    'form.required': 'Ce champ est obligatoire.',
    'form.email': 'Saisissez une adresse e-mail valide.',
    'form.passwordShort': 'Le mot de passe doit contenir au moins 10 caractères.',
    'form.code': 'Saisissez le code à 6 chiffres.',
    'form.userCode': 'Saisissez le code à 8 caractères affiché sur votre appareil.',
    'form.backupCode': 'Un code de secours a 8 caractères, par exemple ABCD-EFGH.',
    mfa_already_enabled: 'La validation en deux étapes est déjà activée.',
    mfa_not_started: 'Recommencez l’activation.',
    mfa_not_enabled: 'La validation en deux étapes n’est pas activée.',
    invalid_credentials: 'Adresse e-mail ou mot de passe incorrect.',
    email_taken: 'Un compte existe déjà avec cette adresse.',
    invalid_email: 'Cette adresse e-mail n’est pas valide.',
    weak_password: 'Ce mot de passe est trop faible.',
    email_not_sent: 'L’e-mail n’a pas pu être envoyé. Réessayez dans un moment.',
    invalid_code: 'Ce code est incorrect.',
    code_expired: 'Ce code a expiré. Demandez-en un nouveau.',
    too_many_attempts: 'Trop d’essais. Demandez un nouveau code.',
    link_expired: 'Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.',
    no_pending_sign_in: 'Votre session a expiré. Reconnectez-vous.',
    not_signed_in: 'Votre session a expiré. Reconnectez-vous.',
    too_many_requests: 'Trop de tentatives. Réessayez dans une minute.',
    session_expired: 'La page a expiré. Rechargez-la.',
    network: 'Connexion impossible. Vérifiez votre réseau.',
    generic: 'Une erreur est survenue. Réessayez.',
  },
};

const en: Text = {
  titles: {
    signIn: 'Sign in',
    signUp: 'Create an account',
    verifyEmail: 'Verify your email',
    forgotPassword: 'Forgot password',
    resetPassword: 'New password',
    consent: 'Allow access',
    accounts: 'Choose an account',
    account: 'Your account',
    device: 'Connect a device',
    deviceDone: 'Device connected',
    deviceRefused: 'Connection refused',
    signedOut: 'You are signed out',
    blocked: 'Access blocked',
    mfa: 'Two-step sign-in',
    twoStep: 'Two-step sign-in',
    yourApps: 'Your apps',
  },
  subtitles: {
    signIn: 'Welcome back. Sign in to continue.',
    signUp: 'It only takes a few seconds.',
    resetPassword: 'Pick a password you do not use anywhere else.',
    accounts: 'Which account do you want to continue with?',
  },
  hero: {
    title: 'One account for all your apps.',
    text: 'Sign in once and find your tools everywhere, safely.',
  },
  links: {
    noAccount: 'No account yet?',
    signUp: 'Create one',
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
    backToSignIn: 'Back to sign in',
    switchAccount: 'Switch account',
    signOut: 'Sign out',
    language: 'Français',
  },
  notes: {
    deviceDone: 'You can close this page and go back to your device.',
    deviceRefused: 'The device was not connected.',
    signedOut: 'Your session on this browser has ended.',
    signedInAs: 'Signed in as',
    blocked: 'This app is still in development: only people its developer added can sign in.',
    blockedContact: 'To get access, write to',
    unverified: 'This app has not been verified yet. Only continue if you know its developer.',
    privacy: 'Privacy',
    terms: 'Terms',
    homepage: 'Website',
  },
  signIn: {
    email: 'Email address',
    password: 'Password',
    forgot: 'Forgot your password?',
    submit: 'Sign in',
    pending: 'Signing in',
  },
  signUp: {
    givenName: 'First name',
    familyName: 'Last name',
    email: 'Email address',
    password: 'Password',
    passwordHint: 'At least 10 characters.',
    submit: 'Create my account',
    pending: 'Creating',
  },
  verifyEmail: {
    sentTo: 'We sent a 6-digit code to',
    code: 'Verification code',
    submit: 'Verify',
    pending: 'Verifying',
    resend: 'Send a new code',
    resent: 'A new code is on its way.',
  },
  forgotPassword: {
    intro: 'Enter your email address and we will send you a link to choose a new password.',
    email: 'Email address',
    submit: 'Send the link',
    pending: 'Sending',
    sent: 'If an account uses this address, a link to reset its password is on its way. Check your inbox.',
  },
  resetPassword: {
    password: 'New password',
    passwordHint: 'At least 10 characters.',
    confirm: 'Confirm the new password',
    mismatch: 'The two passwords differ.',
    submit: 'Save',
    pending: 'Saving',
  },
  consent: {
    wants: 'would like to:',
    signedInAs: 'Signed in as',
    approve: 'Allow',
    deny: 'Cancel',
    pending: 'One moment',
  },
  accountSelect: { other: 'Use another account' },
  appLinks: { open: 'Open' },
  mfaVerify: {
    intro: 'Enter the 6-digit code from your authenticator app.',
    backupIntro: 'Enter one of the backup codes you saved. Each one works once.',
    code: 'Authentication code',
    backupCode: 'Backup code',
    submit: 'Continue',
    pending: 'Checking',
    useBackup: 'Use a backup code',
    useApp: 'Use the authenticator app',
  },
  mfaSetup: {
    off: 'Add a second step to your sign-in: a code from an authenticator app on your phone.',
    start: 'Set up two-step sign-in',
    scan: 'Scan this code with your authenticator app, then enter the 6-digit code it shows.',
    manual: 'Or type this key into the app:',
    code: 'Code from the app',
    confirm: 'Turn on',
    cancel: 'Cancel',
    saveCodes: 'Save these backup codes somewhere safe. Each one signs you in once if you lose your phone. They will not be shown again.',
    copy: 'Copy the codes',
    copied: 'Copied',
    done: 'I saved them',
    on: 'Two-step sign-in is on.',
    codesLeft: 'Backup codes left:',
    renew: 'New codes',
    disable: 'Turn off',
    confirmWithCode: 'Enter a code from the app to confirm.',
    pending: 'One moment',
  },
  deviceActivate: {
    intro: 'Enter the code shown on your device. Only allow a device you are using right now.',
    code: 'Device code',
    approve: 'Allow',
    deny: 'Refuse',
    pending: 'One moment',
  },
  scopes: {
    openid: 'Know who you are',
    profile: 'See your name and picture',
    email: 'See your email address',
    phone: 'See your phone number',
    offline_access: 'Stay signed in while you are not using the app',
    admin: 'Administer the identity provider',
  },
  messages: {
    'form.required': 'This field is required.',
    'form.email': 'Enter a valid email address.',
    'form.passwordShort': 'The password needs at least 10 characters.',
    'form.code': 'Enter the 6-digit code.',
    'form.userCode': 'Enter the 8-character code shown on your device.',
    'form.backupCode': 'A backup code has 8 characters, like ABCD-EFGH.',
    mfa_already_enabled: 'Two-step sign-in is already on.',
    mfa_not_started: 'Start the setup again.',
    mfa_not_enabled: 'Two-step sign-in is not on.',
    invalid_credentials: 'Wrong email or password.',
    email_taken: 'An account already exists with this email.',
    invalid_email: 'This email address is not valid.',
    weak_password: 'This password is too weak.',
    email_not_sent: 'The email could not be sent. Try again in a moment.',
    invalid_code: 'This code is wrong.',
    code_expired: 'This code has expired. Ask for a new one.',
    too_many_attempts: 'Too many tries. Ask for a new code.',
    link_expired: 'This link has expired or was already used. Ask for a new one.',
    no_pending_sign_in: 'Your session expired. Sign in again.',
    not_signed_in: 'Your session expired. Sign in again.',
    too_many_requests: 'Too many attempts. Try again in a minute.',
    session_expired: 'This page has expired. Reload it.',
    network: 'Could not connect. Check your network.',
    generic: 'Something went wrong. Try again.',
  },
};

export const text: Record<Locale, Text> = { fr, en };
