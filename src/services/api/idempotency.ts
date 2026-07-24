import * as Crypto from 'expo-crypto';

export function createSubmissionKey() {
  let value: string | null = null;
  return {
    current: () => {
      value ??= Crypto.randomUUID();
      return value;
    },
    complete: () => {
      value = null;
    },
  };
}
