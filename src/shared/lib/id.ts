// Unique entity ID generator wrapping nanoid
import { nanoid } from 'nanoid';

export function createEntityId(size?: number): string {
  return nanoid(size);
}
