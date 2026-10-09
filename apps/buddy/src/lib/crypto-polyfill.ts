/**
 * Hermes has no WebCrypto. Supabase PKCE needs `crypto.getRandomValues` for the verifier and
 * `crypto.subtle.digest('SHA-256')` for an S256 challenge; without them it falls back to
 * Math.random() and the weaker "plain" method. Fill only what is missing, using expo-crypto.
 */
import * as ExpoCrypto from 'expo-crypto';

type MinimalCrypto = {
  getRandomValues?: typeof ExpoCrypto.getRandomValues;
  subtle?: { digest?: (algorithm: AlgorithmIdentifier, data: BufferSource) => Promise<ArrayBuffer> };
};

const g = globalThis as unknown as { crypto?: MinimalCrypto };
const target: MinimalCrypto = g.crypto ?? {};

if (typeof target.getRandomValues !== 'function') {
  target.getRandomValues = ExpoCrypto.getRandomValues;
}

if (typeof target.subtle?.digest !== 'function') {
  target.subtle = {
    ...target.subtle,
    digest: (algorithm, data) => {
      const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
      if (name.toUpperCase() !== 'SHA-256') {
        return Promise.reject(new Error(`Unsupported digest algorithm: ${name}`));
      }
      return ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256, data);
    },
  };
}

if (!g.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: target, configurable: true });
}
