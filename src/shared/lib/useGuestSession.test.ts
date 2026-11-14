// Unit tests for useGuestSession anonymous UUID generation and localStorage persistence
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isValidUuid } from '@shared/lib/id';
import { GUEST_ID_STORAGE_KEY, useGuestSession } from './useGuestSession';

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  cleanup();
});

describe('useGuestSession', () => {
  it('generates and stores a Web Crypto UUID under tanepack_guest_id when absent', () => {
    const randomUuidSpy = vi.spyOn(crypto, 'randomUUID');

    const { result } = renderHook(() => useGuestSession());

    expect(isValidUuid(result.current)).toBe(true);
    expect(window.localStorage.getItem(GUEST_ID_STORAGE_KEY)).toBe(result.current);
    expect(randomUuidSpy).toHaveBeenCalledTimes(1);
  });

  it('reuses an existing valid UUID already saved in localStorage', () => {
    const existingId = '11111111-2222-4333-8444-555555555555';
    window.localStorage.setItem(GUEST_ID_STORAGE_KEY, existingId);
    const randomUuidSpy = vi.spyOn(crypto, 'randomUUID');

    const { result } = renderHook(() => useGuestSession());

    expect(result.current).toBe(existingId);
    expect(window.localStorage.getItem(GUEST_ID_STORAGE_KEY)).toBe(existingId);
    expect(randomUuidSpy).not.toHaveBeenCalled();
  });

  it('replaces an invalid non-UUID value in localStorage with a valid UUID', () => {
    window.localStorage.setItem(GUEST_ID_STORAGE_KEY, 'not-a-valid-uuid');

    const { result } = renderHook(() => useGuestSession());

    expect(isValidUuid(result.current)).toBe(true);
    expect(result.current).not.toBe('not-a-valid-uuid');
    expect(window.localStorage.getItem(GUEST_ID_STORAGE_KEY)).toBe(result.current);
  });
});
