import { GitHubEncryptionError } from './github-errors.js';

/**
 * Encrypts a secret value using the repository's public key for GitHub Actions secrets.
 * Uses libsodium sealed box encryption.
 */
export async function encryptSecret(value: string, publicKeyBase64: string): Promise<string> {
  try {
    const sodiumModule = await import('libsodium-wrappers');
    const sodium = sodiumModule.default ?? sodiumModule;
    await sodium.ready;

    const publicKey = sodium.from_base64(publicKeyBase64, sodium.base64_variants.ORIGINAL);
    const messageBytes = sodium.from_string(value);
    const encrypted = sodium.crypto_box_seal(messageBytes, publicKey);

    return sodium.to_base64(encrypted, sodium.base64_variants.ORIGINAL);
  } catch (error: unknown) {
    if (error instanceof GitHubEncryptionError) throw error;

    throw new GitHubEncryptionError(
      `Encryption failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
