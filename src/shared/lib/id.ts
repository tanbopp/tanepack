// Unique ID helpers wrapping nanoid for client entities and Web Crypto UUIDs for DB records
import { nanoid } from 'nanoid';

const RFC4122_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createEntityId(size?: number): string {
  return nanoid(size);
}

/** Generates a standard RFC-4122 UUID via Web Crypto for persisted Postgres records. */
export function createUuid(): string {
  return crypto.randomUUID();
}

/** Validates whether a value is a well-formed RFC-4122 UUID string. */
export function isValidUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && RFC4122_UUID_PATTERN.test(value);
}
