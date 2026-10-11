/**
 * Passkey ceremonies in the browser. The provider sends WebAuthn options as JSON (binary fields
 * in base64url) and takes the credential back the same way; these turn one into the other.
 */

type Json = Record<string, unknown>;

const toBytes = (text: string): ArrayBuffer => {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

const toText = (buffer: ArrayBuffer | null | undefined): string | undefined => {
  if (!buffer) return undefined;
  let binary = '';
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const descriptors = (list: unknown): PublicKeyCredentialDescriptor[] =>
  Array.isArray(list)
    ? list.map((item: Json) => ({ ...item, id: toBytes(String(item.id)) }) as PublicKeyCredentialDescriptor)
    : [];

/** True when this browser can make and use passkeys. */
export function passkeysSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential === 'function';
}

/** True when the email field can offer passkeys as it is focused (conditional mediation). */
export async function passkeyAutofillSupported(): Promise<boolean> {
  if (!passkeysSupported()) return false;
  const check = PublicKeyCredential.isConditionalMediationAvailable;
  return typeof check === 'function' ? check.call(PublicKeyCredential) : false;
}

/** What a cancelled or refused ceremony throws, so hosts can show one message for it. */
export class PasskeyCancelled extends Error {
  constructor() {
    super('passkey_cancelled');
  }
}

const settle = async (promise: Promise<Credential | null>): Promise<PublicKeyCredential> => {
  try {
    const credential = await promise;
    if (!credential) throw new PasskeyCancelled();
    return credential as PublicKeyCredential;
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'AbortError')) {
      throw new PasskeyCancelled();
    }
    // The device already holds a passkey for this account (one of excludeCredentials).
    if (error instanceof DOMException && error.name === 'InvalidStateError') throw new Error('passkey_exists');
    throw error;
  }
};

/** Makes a passkey on this device from the provider's registration options; answers its JSON. */
export async function createPasskey(options: Json): Promise<Json> {
  const user = options.user as Json;
  const publicKey = {
    ...options,
    challenge: toBytes(String(options.challenge)),
    user: { ...user, id: toBytes(String(user.id)) },
    excludeCredentials: descriptors(options.excludeCredentials),
  } as unknown as PublicKeyCredentialCreationOptions;
  const credential = await settle(navigator.credentials.create({ publicKey }));
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: toText(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: toText(response.clientDataJSON),
      attestationObject: toText(response.attestationObject),
      transports: typeof response.getTransports === 'function' ? response.getTransports() : [],
    },
    clientExtensionResults: credential.getClientExtensionResults(),
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
  };
}

/**
 * Asks for a passkey with the provider's sign-in options; answers its JSON. `conditional` waits
 * for the person to pick one from the email field's suggestions, until `signal` aborts it.
 */
export async function getPasskey(options: Json, conditional = false, signal?: AbortSignal): Promise<Json> {
  const publicKey = {
    ...options,
    challenge: toBytes(String(options.challenge)),
    allowCredentials: descriptors(options.allowCredentials),
  } as unknown as PublicKeyCredentialRequestOptions;
  const credential = await settle(
    navigator.credentials.get({ publicKey, signal, ...(conditional ? { mediation: 'conditional' as CredentialMediationRequirement } : {}) }),
  );
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: toText(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: toText(response.clientDataJSON),
      authenticatorData: toText(response.authenticatorData),
      signature: toText(response.signature),
      userHandle: toText(response.userHandle),
    },
    clientExtensionResults: credential.getClientExtensionResults(),
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
  };
}
