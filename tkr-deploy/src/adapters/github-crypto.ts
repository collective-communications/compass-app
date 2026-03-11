import { GitHubEncryptionError } from './github-errors.js';

/**
 * Encrypts a secret value using the repository's public key for GitHub Actions secrets.
 * Uses tweetnacl sealed box encryption (libsodium-compatible).
 *
 * @param value - The plaintext secret value to encrypt
 * @param publicKeyBase64 - The repository's public key (base64-encoded)
 * @returns The encrypted value as a base64 string
 */
export async function encryptSecret(value: string, publicKeyBase64: string): Promise<string> {
  try {
    const nacl = await import('tweetnacl');
    const naclUtil = await import('tweetnacl-util');

    const publicKey = naclUtil.decodeBase64(publicKeyBase64);
    const messageBytes = naclUtil.decodeUTF8(value);

    const encrypted = nacl.sealedbox
      ? nacl.sealedbox.seal(messageBytes, publicKey)
      : sealedBoxSeal(messageBytes, publicKey, nacl);

    return naclUtil.encodeBase64(encrypted);
  } catch (error: unknown) {
    if (error instanceof GitHubEncryptionError) throw error;

    // Module not available
    if (
      error instanceof Error &&
      (error.message.includes('Cannot find module') ||
        error.message.includes('MODULE_NOT_FOUND') ||
        error.message.includes("No module named"))
    ) {
      throw new GitHubEncryptionError(
        'tweetnacl and tweetnacl-util are required for secret encryption. Install with: bun add tweetnacl tweetnacl-util',
      );
    }

    throw new GitHubEncryptionError(
      `Encryption failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Manual sealed box implementation using tweetnacl primitives.
 * A sealed box is: ephemeral_pk || box(message, nonce, recipient_pk, ephemeral_sk)
 * where nonce = blake2b(ephemeral_pk || recipient_pk) — but since tweetnacl doesn't
 * have blake2b, we use crypto_hash (SHA-512) truncated to 24 bytes as the nonce.
 */
function sealedBoxSeal(
  message: Uint8Array,
  recipientPk: Uint8Array,
  nacl: typeof import('tweetnacl'),
): Uint8Array {
  const ephemeralKeys = nacl.box.keyPair();

  // Nonce = first 24 bytes of SHA-512(ephemeral_pk || recipient_pk)
  const nonceInput = new Uint8Array(ephemeralKeys.publicKey.length + recipientPk.length);
  nonceInput.set(ephemeralKeys.publicKey, 0);
  nonceInput.set(recipientPk, ephemeralKeys.publicKey.length);
  const hash = nacl.hash(nonceInput);
  const nonce = hash.slice(0, nacl.box.nonceLength);

  const encrypted = nacl.box(message, nonce, recipientPk, ephemeralKeys.secretKey);
  if (!encrypted) {
    throw new GitHubEncryptionError('nacl.box returned null — encryption failed');
  }

  // sealed box = ephemeral_pk || encrypted
  const result = new Uint8Array(ephemeralKeys.publicKey.length + encrypted.length);
  result.set(ephemeralKeys.publicKey, 0);
  result.set(encrypted, ephemeralKeys.publicKey.length);

  return result;
}
