// Anonymous guest session hook persisting a client-generated UUID in localStorage
import { useState } from 'react';
import { createUuid, isValidUuid } from '@shared/lib/id';

export const GUEST_ID_STORAGE_KEY = 'tanepack_guest_id';

/** Reads an existing UUID from localStorage or generates and persists a new one. */
export function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  try {
    const existing = window.localStorage.getItem(GUEST_ID_STORAGE_KEY);
    if (isValidUuid(existing)) {
      return existing;
    }

    const generated = createUuid();
    window.localStorage.setItem(GUEST_ID_STORAGE_KEY, generated);
    return generated;
  } catch {
    return createUuid();
  }
}

/** Returns a stable anonymous guest UUID stored under tanepack_guest_id. */
export function useGuestSession(): string {
  const [guestId] = useState<string>(() => getOrCreateGuestId());
  return guestId;
}
