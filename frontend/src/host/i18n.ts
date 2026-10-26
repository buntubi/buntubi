/** Every word the pages and elements show, in French and English. */
import type { SignInLabels } from '../elements/sign-in/sign-in.js';
import type { SignUpLabels } from '../elements/sign-up/sign-up.js';
import type { VerifyEmailLabels } from '../elements/verify-email/verify-email.js';
import type { ForgotPasswordLabels } from '../elements/forgot-password/forgot-password.js';
import type { ResetPasswordLabels } from '../elements/reset-password/reset-password.js';
import type { ConsentLabels } from '../elements/consent/consent.js';
import type { AccountSelectLabels } from '../elements/account-select/account-select.js';
import type { OrganizationSelectLabels } from '../elements/organization-select/organization-select.js';
import type { DeviceActivateLabels } from '../elements/device-activate/device-activate.js';
import type { MfaVerifyLabels } from '../elements/mfa-verify/mfa-verify.js';
import type { SecureAccountLabels } from '@idp/elements/secure-account/logic';
import type { SocialButtonsLabels } from '@idp/elements/social-buttons/logic';
import type { CompleteProfileLabels } from '../elements/complete-profile/complete-profile.js';
import type { AcceptTermsLabels } from '../elements/accept-terms/accept-terms.js';
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
    organization: string;
    account: string;
    device: string;
    deviceDone: string;
    deviceRefused: string;
    signedOut: string;
    logoutConfirm: string;
    blocked: string;
    authorizeError: string;
    mfa: string;
    twoStep: string;
    secureAccount: string;
    yourApps: string;
    completeProfile: string;
    acceptTerms: string;
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
    privacy: string;
    terms: string;
  };
  notes: {
    deviceDone: string;
    deviceRefused: string;
    signedOut: string;
    logoutAsk: string;
    logoutAskApp: string;
    logoutAction: string;
    logoutCancel: string;
    signedInAs: string;
    blocked: string;
    /** The authorization request could not go back to its app. */
    authorizeError: string;
    authorizeErrorCode: string;
    blockedContact: string;
    unverified: string;
    privacy: string;
    terms: string;
    homepage: string;
    /** Above the fields a sign-in found missing, for an account that exists. */
    profileMissing: string;
  };
  signIn: SignInLabels;
  signUp: SignUpLabels;
  verifyEmail: VerifyEmailLabels;
  forgotPassword: ForgotPasswordLabels;
  resetPassword: ResetPasswordLabels;
  consent: ConsentLabels;
  accountSelect: AccountSelectLabels;
  organizationSelect: OrganizationSelectLabels;
  theme: { theme: string; schemes: { light: string; dark: string; system: string } };
  deviceActivate: DeviceActivateLabels;
  mfaVerify: MfaVerifyLabels;
  secureAccount: SecureAccountLabels;
  social: {
    buttons: SocialButtonsLabels;
    /** Why a round trip to a provider ended without a sign-in, by code; {provider} is its name. */
    refusals: Record<string, string>;
    /** On the sign-up page when the deployment or the app closed sign-up. */
    signupClosed: string;
  };
  completeProfile: CompleteProfileLabels;
  acceptTerms: AcceptTermsLabels;
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
    organization: 'Choisir une organisation',
    account: 'Votre compte',
    device: 'Connecter un appareil',
    deviceDone: 'Appareil connecté',
    deviceRefused: 'Connexion refusée',
    signedOut: 'Vous êtes déconnecté',
    logoutConfirm: 'Se déconnecter ?',
    blocked: 'Accès bloqué',
    authorizeError: 'Ce lien ne fonctionne pas',
    mfa: 'Validation en deux étapes',
    twoStep: 'Validation en deux étapes',
    secureAccount: 'Protégez votre compte',
    completeProfile: 'Encore une étape',
    acceptTerms: 'Conditions d’utilisation',
    yourApps: 'Vos applications',
  },
  subtitles: {
    signIn: 'Ravi de vous revoir. Connectez-vous pour continuer.',
    signUp: 'Quelques secondes suffisent.',
    resetPassword: 'Choisissez un mot de passe que vous n’utilisez nulle part ailleurs.',
    accounts: 'Avec quel compte voulez-vous continuer ?',
    organization: 'Dans quelle organisation voulez-vous continuer ?',
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
    privacy: 'Confidentialité',
    terms: 'Conditions',
  },
  notes: {
    deviceDone: 'Vous pouvez fermer cette page et revenir sur votre appareil.',
    deviceRefused: 'L’appareil n’a pas été connecté.',
    signedOut: 'Votre session est terminée sur ce navigateur.',
    logoutAsk: 'Voulez-vous vous déconnecter de ce navigateur ?',
    logoutAskApp: '{app} demande à vous déconnecter de ce navigateur.',
    logoutAction: 'Se déconnecter',
    logoutCancel: 'Rester connecté',
    signedInAs: 'Connecté en tant que',
    blocked: 'Cette application est encore en développement : seules les personnes que son développeur a ajoutées peuvent s’y connecter.',
    authorizeError: 'L’application qui vous a envoyé ici a fait une demande de connexion que nous ne pouvons pas accepter. Revenez à l’application et réessayez, ou contactez son assistance si cela continue.',
    authorizeErrorCode: 'Code d’erreur : {code}',
    blockedContact: 'Pour y accéder, écrivez à',
    unverified: 'Cette application n’a pas encore été vérifiée. Ne continuez que si vous connaissez son développeur.',
    privacy: 'Confidentialité',
    terms: 'Conditions',
    homepage: 'Site',
    profileMissing: 'Quelques informations sont nécessaires avant de continuer.',
  },
  signIn: {
    email: 'Adresse e-mail',
    password: 'Mot de passe',
    forgot: 'Mot de passe oublié ?',
    submit: 'Se connecter',
    pending: 'Connexion',
    or: 'ou',
    passkey: 'Se connecter avec une clé d’accès',
    passkeyPending: 'En attente de votre appareil',
  },
  signUp: {
    givenName: 'Prénom',
    familyName: 'Nom',
    email: 'Adresse e-mail',
    password: 'Mot de passe',
    passwordHint: 'Au moins 10 caractères.',
    submit: 'Créer mon compte',
    pending: 'Création',
    fields: {
      birthdate: 'Date de naissance',
      gender: 'Genre',
      middle_name: 'Deuxième prénom',
      nickname: 'Surnom',
      website: 'Site web',
      zoneinfo: 'Fuseau horaire',
    },
    genders: { female: 'Femme', male: 'Homme', other: 'Autre' },
    acceptTerms: 'J’accepte les {terms}',
    termsLink: 'conditions d’utilisation',
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
    forOrganization: 'Dans {organization} seulement.',
    signedInAs: 'Connecté en tant que',
    approve: 'Autoriser',
    deny: 'Annuler',
    pending: 'Un instant',
  },
  theme: { theme: 'Thème', schemes: { light: 'Clair', dark: 'Sombre', system: 'Système' } },
  accountSelect: {
    other: 'Utiliser un autre compte',
    signedIn: 'Connecté',
    continueTo: 'pour continuer vers {app}',
    sees: '{app} voit le compte que vous choisissez, et seulement ce que vous autorisez.',
  },
  organizationSelect: {
    continueTo: 'pour continuer vers {app}',
    sees: '{app} travaille dans l’organisation que vous choisissez, et seulement là.',
    roles: { owner: 'Propriétaire', admin: 'Administrateur', billing: 'Facturation', member: 'Membre', guest: 'Invité' },
  },
  secureAccount: {
    intro: 'Un mot de passe seul peut être deviné ou volé. Ajoutez l’une de ces protections maintenant, ou plus tard depuis Sécurité dans votre compte.',
    passkey: {
      title: 'Une clé d’accès',
      text: 'Connectez-vous avec votre empreinte, votre visage ou le verrouillage de l’écran. Rien à saisir, rien à voler.',
      badge: 'Recommandé',
      action: 'Ajouter une clé',
    },
    app: {
      title: 'Validation en deux étapes',
      text: 'Après le mot de passe, un code d’une application d’authentification sur votre téléphone.',
      action: 'Configurer',
    },
    later: 'Pas maintenant',
    laterNote: 'Vous pourrez ajouter l’une ou l’autre plus tard depuis Sécurité dans votre compte.',
    passkeyDone: 'Votre clé d’accès est prête. La prochaine fois, connectez-vous avec elle.',
    appDone: 'La validation en deux étapes est activée.',
    another: 'Ajoutez aussi l’autre, pour pouvoir vous connecter si vous perdez l’accès à celle-ci.',
    skip: 'Ignorer',
    bothDone: 'Votre clé d’accès et la validation en deux étapes sont activées.',
    continue: 'Continuer',
    error: 'Une erreur est survenue. Réessayez.',
  },
  mfaVerify: {
    intro: 'Saisissez le code à 6 chiffres affiché par votre application d’authentification.',
    backupIntro: 'Saisissez l’un des codes de secours que vous avez enregistrés. Chacun ne sert qu’une fois.',
    code: 'Code d’authentification',
    backupCode: 'Code de secours',
    submit: 'Continuer',
    pending: 'Vérification',
    useBackup: 'Utiliser un code de secours',
    useApp: 'Utiliser l’application',
    usePasskey: 'Utiliser une clé d’accès',
    passkeyPending: 'En attente de votre appareil',
    passkeyIntro: 'Confirmez que c’est bien vous avec votre clé d’accès.',
    passkeyUnavailable: 'Ce navigateur ne peut pas utiliser de clé d’accès. Continuez sur l’appareil où vous l’avez créée.',
  },
  deviceActivate: {
    intro: 'Saisissez le code affiché sur votre appareil. N’autorisez qu’un appareil que vous utilisez en ce moment.',
    code: 'Code de l’appareil',
    approve: 'Autoriser',
    deny: 'Refuser',
    pending: 'Un instant',
  },
  social: {
    buttons: { continueWith: 'Continuer avec {provider}', separator: 'ou' },
    refusals: {
      expired: 'La connexion a pris trop de temps. Réessayez.',
      cancelled: 'Connexion avec {provider} annulée.',
      provider_failed: '{provider} n’a pas pu confirmer qui vous êtes. Réessayez ou utilisez votre adresse e-mail.',
      account_disabled: 'Ce compte est désactivé.',
      account_exists: 'Un compte utilise déjà cette adresse. Connectez-vous avec, puis liez {provider} depuis votre compte.',
      no_verified_email: '{provider} n’a pas donné d’adresse e-mail vérifiée. Créez le compte avec votre adresse e-mail.',
      signup_closed: 'La création de compte se fait sur invitation.',
      already_linked: 'Ce compte {provider} est déjà lié à un autre compte.',
    },
    signupClosed: 'La création de compte se fait sur invitation. Une adresse invitée peut créer son compte ici.',
  },
  completeProfile: {
    intro: 'Encore une étape pour créer le compte de {email}.',
    submit: 'Créer mon compte',
    pending: 'Création',
    fields: {
      birthdate: 'Date de naissance',
      gender: 'Genre',
      middle_name: 'Deuxième prénom',
      nickname: 'Surnom',
      website: 'Site web',
      zoneinfo: 'Fuseau horaire',
    },
    genders: { female: 'Femme', male: 'Homme', other: 'Autre' },
    acceptTerms: 'J’accepte les {terms}',
    termsLink: 'conditions d’utilisation',
  },
  acceptTerms: {
    intro: 'Les conditions d’utilisation ont changé depuis votre dernière acceptation. Lisez-les, puis acceptez pour continuer.',
    acceptTerms: 'J’accepte les {terms}',
    termsLink: 'conditions d’utilisation',
    submit: 'Continuer',
    pending: 'Un instant',
  },
  scopes: {
    openid: 'Vous identifier',
    profile: 'Voir votre nom et votre photo',
    email: 'Voir votre adresse e-mail',
    phone: 'Voir votre numéro de téléphone',
    address: 'Voir votre adresse postale',
    offline_access: 'Rester connecté quand vous n’utilisez pas l’application',
    'organizations:read': 'Voir vos organisations, leurs membres et votre rôle',
    'organizations:manage': 'Gérer vos organisations et leurs membres, selon votre rôle',
    admin: 'Administrer le fournisseur d’identité',
  },
  messages: {
    'form.required': 'Ce champ est obligatoire.',
    'form.email': 'Saisissez une adresse e-mail valide.',
    'form.passwordShort': 'Le mot de passe doit contenir au moins 10 caractères.',
    'form.code': 'Saisissez le code à 6 chiffres.',
    'form.userCode': 'Saisissez le code à 8 caractères affiché sur votre appareil.',
    'form.backupCode': 'Un code de secours a 8 caractères, par exemple ABCD-EFGH.',
    'form.tooLong': 'C’est trop long.',
    'form.date': 'Une date au format AAAA-MM-JJ.',
    'form.choice': 'Choisissez dans la liste.',
    'form.website': 'Une adresse qui commence par https://.',
    'form.terms': 'Acceptez les conditions d’utilisation pour continuer.',
    'form.country': 'Deux lettres, par exemple SN ou FR.',
    'form.phone': 'Format international, par exemple +221771234567.',
    wrong_password: 'Mot de passe incorrect.',
    same_password: 'Choisissez un mot de passe différent de l’actuel.',
    passkey_failed: 'Cette clé d’accès n’a pas pu être vérifiée.',
    passkey_expired: 'La demande a expiré. Réessayez.',
    passkey_exists: 'Cette clé d’accès est déjà enregistrée.',
    passkey_cancelled: 'Aucune clé d’accès n’a été utilisée.',
    reauth_required: 'Saisissez votre mot de passe pour continuer.',
    invalid_name: 'Donnez-lui un nom de 64 caractères au plus.',
    not_found: 'Introuvable : la page n’est peut-être plus à jour.',
    passkey_other_account: 'Cette clé d’accès appartient à un autre compte.',
    this_device: 'Pour cet appareil, utilisez « Se déconnecter » dans le menu du compte.',
    platform_app: 'On quitte cette application en se déconnectant.',
    email_mismatch: 'Ce n’est pas l’adresse de ce compte.',
    owns_organizations: 'Donnez d’abord un autre propriétaire à vos organisations.',
    last_admin: 'Le dernier administrateur ne peut pas supprimer son compte.',
    same_email: 'C’est déjà votre adresse.',
    invalid_phone: 'Ce numéro n’est pas valide.',
    invalid_country: 'Ce pays n’est pas reconnu.',
    invalid_birthdate: 'Cette date de naissance n’est pas valide.',
    invalid_gender: 'Choisissez un genre dans la liste.',
    invalid_middle_name: 'Ce deuxième prénom n’est pas valide.',
    invalid_nickname: 'Ce surnom n’est pas valide.',
    invalid_website: 'Cette adresse de site n’est pas valide.',
    invalid_zoneinfo: 'Ce fuseau horaire n’est pas reconnu.',
    birthdate_required: 'La date de naissance est obligatoire.',
    gender_required: 'Le genre est obligatoire.',
    middle_name_required: 'Le deuxième prénom est obligatoire.',
    nickname_required: 'Le surnom est obligatoire.',
    website_required: 'Le site web est obligatoire.',
    zoneinfo_required: 'Le fuseau horaire est obligatoire.',
    unknown_field: 'Ce champ n’est pas proposé.',
    signup_closed: 'La création de compte se fait sur invitation.',
    expired: 'Cette étape a expiré. Recommencez la connexion.',
    terms_required: 'Acceptez les conditions d’utilisation pour continuer.',
    last_way_in: 'Ajoutez un mot de passe ou une passkey avant de retirer votre seul moyen de connexion.',
    too_long: 'C’est trop long.',
    unsupported_picture: 'Choisissez une image JPEG, PNG ou WebP.',
    picture_too_large: 'Cette image est trop lourde.',
    mfa_already_enabled: 'La validation en deux étapes est déjà activée.',
    mfa_not_started: 'Recommencez l’activation.',
    mfa_not_enabled: 'La validation en deux étapes n’est pas activée.',
    invalid_credentials: 'Adresse e-mail ou mot de passe incorrect.',
    email_taken: 'Un compte existe déjà avec cette adresse.',
    invalid_email: 'Cette adresse e-mail n’est pas valide.',
    weak_password: 'Ce mot de passe est trop faible.',
    breached_password: 'Ce mot de passe figure dans des listes de mots de passe divulgués. Choisissez-en un autre.',
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
    organization: 'Choose an organization',
    account: 'Your account',
    device: 'Connect a device',
    deviceDone: 'Device connected',
    deviceRefused: 'Connection refused',
    signedOut: 'You are signed out',
    logoutConfirm: 'Sign out?',
    blocked: 'Access blocked',
    authorizeError: 'This link does not work',
    mfa: 'Two-step sign-in',
    twoStep: 'Two-step sign-in',
    secureAccount: 'Protect your account',
    completeProfile: 'One more step',
    acceptTerms: 'Terms of use',
    yourApps: 'Your apps',
  },
  subtitles: {
    signIn: 'Welcome back. Sign in to continue.',
    signUp: 'It only takes a few seconds.',
    resetPassword: 'Pick a password you do not use anywhere else.',
    accounts: 'Which account do you want to continue with?',
    organization: 'Which organization do you want to continue in?',
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
    privacy: 'Privacy',
    terms: 'Terms',
  },
  notes: {
    deviceDone: 'You can close this page and go back to your device.',
    deviceRefused: 'The device was not connected.',
    signedOut: 'Your session on this browser has ended.',
    logoutAsk: 'Do you want to sign out of this browser?',
    logoutAskApp: '{app} asks to sign you out of this browser.',
    logoutAction: 'Sign out',
    logoutCancel: 'Stay signed in',
    signedInAs: 'Signed in as',
    blocked: 'This app is still in development: only people its developer added can sign in.',
    authorizeError: 'The app that sent you here made a sign-in request we cannot accept. Go back to the app and try again, or contact its support if this keeps happening.',
    authorizeErrorCode: 'Error code: {code}',
    blockedContact: 'To get access, write to',
    unverified: 'This app has not been verified yet. Only continue if you know its developer.',
    privacy: 'Privacy',
    terms: 'Terms',
    homepage: 'Website',
    profileMissing: 'A few details are needed before you continue.',
  },
  signIn: {
    email: 'Email address',
    password: 'Password',
    forgot: 'Forgot your password?',
    submit: 'Sign in',
    pending: 'Signing in',
    or: 'or',
    passkey: 'Sign in with a passkey',
    passkeyPending: 'Waiting for your device',
  },
  signUp: {
    givenName: 'First name',
    familyName: 'Last name',
    email: 'Email address',
    password: 'Password',
    passwordHint: 'At least 10 characters.',
    submit: 'Create my account',
    pending: 'Creating',
    fields: {
      birthdate: 'Date of birth',
      gender: 'Gender',
      middle_name: 'Middle name',
      nickname: 'Nickname',
      website: 'Website',
      zoneinfo: 'Time zone',
    },
    genders: { female: 'Female', male: 'Male', other: 'Other' },
    acceptTerms: 'I accept the {terms}',
    termsLink: 'terms of use',
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
    forOrganization: 'In {organization} only.',
    signedInAs: 'Signed in as',
    approve: 'Allow',
    deny: 'Cancel',
    pending: 'One moment',
  },
  theme: { theme: 'Theme', schemes: { light: 'Light', dark: 'Dark', system: 'System' } },
  accountSelect: {
    other: 'Use another account',
    signedIn: 'Signed in',
    continueTo: 'to continue to {app}',
    sees: '{app} sees the account you choose, and only what you allow.',
  },
  organizationSelect: {
    continueTo: 'to continue to {app}',
    sees: '{app} works in the organization you choose, and only there.',
    roles: { owner: 'Owner', admin: 'Admin', billing: 'Billing', member: 'Member', guest: 'Guest' },
  },
  secureAccount: {
    intro: 'A password alone can be guessed or stolen. Add one of these now, or later from Security in your account.',
    passkey: {
      title: 'A passkey',
      text: 'Sign in with your fingerprint, face or screen lock. Nothing to type, nothing to steal.',
      badge: 'Recommended',
      action: 'Add a passkey',
    },
    app: {
      title: 'Two-step sign-in',
      text: 'After your password, a code from an authenticator app on your phone.',
      action: 'Set up',
    },
    later: 'Not now',
    laterNote: 'You can add either one later from Security in your account.',
    passkeyDone: 'Your passkey is ready. Next time, sign in with it.',
    appDone: 'Two-step sign-in is on.',
    another: 'Add the other one too, so you can still sign in if you lose access to this one.',
    skip: 'Skip',
    bothDone: 'Your passkey and two-step sign-in are both on.',
    continue: 'Continue',
    error: 'Something went wrong. Try again.',
  },
  mfaVerify: {
    intro: 'Enter the 6-digit code from your authenticator app.',
    backupIntro: 'Enter one of the backup codes you saved. Each one works once.',
    code: 'Authentication code',
    backupCode: 'Backup code',
    submit: 'Continue',
    pending: 'Checking',
    useBackup: 'Use a backup code',
    useApp: 'Use the authenticator app',
    usePasskey: 'Use a passkey',
    passkeyPending: 'Waiting for your device',
    passkeyIntro: 'Confirm it is you with your passkey.',
    passkeyUnavailable: 'This browser cannot use a passkey. Continue on the device where you made it.',
  },
  deviceActivate: {
    intro: 'Enter the code shown on your device. Only allow a device you are using right now.',
    code: 'Device code',
    approve: 'Allow',
    deny: 'Refuse',
    pending: 'One moment',
  },
  social: {
    buttons: { continueWith: 'Continue with {provider}', separator: 'or' },
    refusals: {
      expired: 'Signing in took too long. Try again.',
      cancelled: 'Signing in with {provider} was cancelled.',
      provider_failed: '{provider} could not confirm who you are. Try again or use your email address.',
      account_disabled: 'This account is disabled.',
      account_exists: 'An account already uses this address. Sign in with it, then link {provider} from your account.',
      no_verified_email: '{provider} gave no verified email address. Create the account with your email address.',
      signup_closed: 'Accounts are made by invitation.',
      already_linked: 'This {provider} account is already linked to another account.',
    },
    signupClosed: 'Accounts are made by invitation. An invited address can create its account here.',
  },
  completeProfile: {
    intro: 'One more step to make the account for {email}.',
    submit: 'Create my account',
    pending: 'Creating',
    fields: {
      birthdate: 'Date of birth',
      gender: 'Gender',
      middle_name: 'Middle name',
      nickname: 'Nickname',
      website: 'Website',
      zoneinfo: 'Time zone',
    },
    genders: { female: 'Female', male: 'Male', other: 'Other' },
    acceptTerms: 'I accept the {terms}',
    termsLink: 'terms of use',
  },
  acceptTerms: {
    intro: 'The terms of use have changed since you last accepted them. Read them, then accept to continue.',
    acceptTerms: 'I accept the {terms}',
    termsLink: 'terms of use',
    submit: 'Continue',
    pending: 'Continuing',
  },
  scopes: {
    openid: 'Know who you are',
    profile: 'See your name and picture',
    email: 'See your email address',
    phone: 'See your phone number',
    address: 'See your postal address',
    offline_access: 'Stay signed in while you are not using the app',
    'organizations:read': 'See your organizations, their members and your role',
    'organizations:manage': 'Manage your organizations and their members, as your role allows',
    admin: 'Administer the identity provider',
  },
  messages: {
    'form.required': 'This field is required.',
    'form.email': 'Enter a valid email address.',
    'form.passwordShort': 'The password needs at least 10 characters.',
    'form.code': 'Enter the 6-digit code.',
    'form.userCode': 'Enter the 8-character code shown on your device.',
    'form.backupCode': 'A backup code has 8 characters, like ABCD-EFGH.',
    'form.tooLong': 'This is too long.',
    'form.date': 'A date as YYYY-MM-DD.',
    'form.choice': 'Pick one from the list.',
    'form.website': 'An address starting with https://.',
    'form.terms': 'Accept the terms of use to continue.',
    'form.country': 'Two letters, such as SN or FR.',
    'form.phone': 'International format, such as +221771234567.',
    wrong_password: 'Wrong password.',
    same_password: 'Pick a password different from the current one.',
    passkey_failed: 'This passkey could not be verified.',
    passkey_expired: 'The request expired. Try again.',
    passkey_exists: 'This passkey is already saved.',
    passkey_cancelled: 'No passkey was used.',
    reauth_required: 'Enter your password to go on.',
    invalid_name: 'Give it a name of 64 characters at most.',
    not_found: 'Not found: the page may be out of date.',
    passkey_other_account: 'This passkey belongs to another account.',
    this_device: 'For this device, use Sign out in the account menu.',
    platform_app: 'You leave this app by signing out.',
    email_mismatch: 'This is not this account’s address.',
    owns_organizations: 'Give your organizations another owner first.',
    last_admin: 'The last administrator cannot delete their account.',
    same_email: 'This is already your address.',
    invalid_phone: 'This number is not valid.',
    invalid_country: 'This country is not recognised.',
    invalid_birthdate: 'This date of birth is not valid.',
    invalid_gender: 'Pick a gender from the list.',
    invalid_middle_name: 'This middle name is not valid.',
    invalid_nickname: 'This nickname is not valid.',
    invalid_website: 'This website address is not valid.',
    invalid_zoneinfo: 'This time zone is not recognised.',
    birthdate_required: 'Date of birth is required.',
    gender_required: 'Gender is required.',
    middle_name_required: 'Middle name is required.',
    nickname_required: 'Nickname is required.',
    website_required: 'Website is required.',
    zoneinfo_required: 'Time zone is required.',
    unknown_field: 'This field is not offered.',
    signup_closed: 'Accounts are made by invitation.',
    expired: 'This step expired. Start signing in again.',
    terms_required: 'Accept the terms of use to continue.',
    last_way_in: 'Add a password or a passkey before removing your only way in.',
    too_long: 'This is too long.',
    unsupported_picture: 'Pick a JPEG, PNG or WebP image.',
    picture_too_large: 'This image is too large.',
    mfa_already_enabled: 'Two-step sign-in is already on.',
    mfa_not_started: 'Start the setup again.',
    mfa_not_enabled: 'Two-step sign-in is not on.',
    invalid_credentials: 'Wrong email or password.',
    email_taken: 'An account already exists with this email.',
    invalid_email: 'This email address is not valid.',
    weak_password: 'This password is too weak.',
    breached_password: 'This password appears in lists of leaked passwords. Choose another one.',
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
