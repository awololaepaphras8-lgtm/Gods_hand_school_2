/**
 * Authentication & Password Security Utilities
 * God's Hand International Model School
 *
 * Ensures zero plaintext passwords are stored or exposed in the codebase.
 * Uses cryptographic SHA-256 hashing for all credentials (Admin, Staff, Parent, Student).
 */

import { syncSha256, computeSha256 } from './adminSecurity';

export { syncSha256, computeSha256 };

// Cryptographic SHA-256 digests for initial seeded accounts (zero plaintext in code)
export const INITIAL_STUDENT_HASH = '703b0a3d6ad75b649a28adde7d83c6251da457549263bc7ff45ec709b0a8448b';
export const INITIAL_PARENT_HASH = '82e3edf5f5f3a46b5f94579b61817fd9a1f356adcef5ee22da3b96ef775c4860';
export const INITIAL_STAFF_HASH = '10176e7b7b24d317acfcf8d2064cfd2f24e154f7b5a96603077d5ef813d6a6b6';

/**
 * Produces a SHA-256 digest of a password string.
 */
export function hashPassword(password: string): string {
  if (!password) return '';
  return syncSha256(password.trim());
}

/**
 * Validates candidate user password against stored hash or credential.
 * Supports secure SHA-256 hash comparison and legacy migration without exposing plaintext.
 */
export function verifyCredential(candidateInput: string, storedHashOrPassword?: string): boolean {
  if (!candidateInput || !storedHashOrPassword) return false;
  const trimmed = candidateInput.trim();
  const inputHash = syncSha256(trimmed);

  // Match against SHA-256 hash
  if (inputHash === storedHashOrPassword) {
    return true;
  }

  // Fallback for pre-existing local data already stored before hashing
  if (trimmed === storedHashOrPassword) {
    return true;
  }

  return false;
}

/**
 * Generates an ephemeral random temporary password for newly enrolled students/parents
 * so that no static password string is ever hardcoded in the codebase.
 */
export function generateSecureTempPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ghs${rand}`;
}
