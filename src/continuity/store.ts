import type { ParseResult } from "./value";

export type Unsubscribe = () => void;

export type BoundedStore<T> = {
  getSnapshot(): T;
  replace(next: T): void;
  reset(): void;
  subscribe(listener: () => void): Unsubscribe;
};

export function createBoundedStore<T>(
  createDefault: () => T,
  initial: T = createDefault(),
): BoundedStore<T> {
  let state = initial;
  const listeners = new Set<() => void>();

  function replace(next: T) {
    if (Object.is(state, next)) return;
    state = next;
    listeners.forEach((listener) => listener());
  }

  return {
    getSnapshot: () => state,
    replace,
    reset: () => replace(createDefault()),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type SessionStorageLike = Pick<
  Storage,
  "getItem" | "removeItem" | "setItem"
>;

export type SessionRecord<T> = {
  clear(): void;
  read(): T;
  write(value: T): boolean;
};

export function createSessionRecord<T>({
  storage,
  key,
  parse,
  createDefault,
}: {
  storage: SessionStorageLike;
  key: string;
  parse: (value: unknown) => ParseResult<T>;
  createDefault: () => T;
}): SessionRecord<T> {
  function clear() {
    try {
      storage.removeItem(key);
    } catch {
      // A blocked storage boundary is equivalent to an empty transient concern.
    }
  }

  return {
    clear,
    read() {
      let serialized: string | null;
      try {
        serialized = storage.getItem(key);
      } catch {
        return createDefault();
      }
      if (serialized === null) return createDefault();

      let candidate: unknown;
      try {
        candidate = JSON.parse(serialized);
      } catch {
        clear();
        return createDefault();
      }

      const result = parse(candidate);
      if (!result.ok) {
        clear();
        return createDefault();
      }
      return result.value;
    },
    write(value) {
      const result = parse(value);
      if (!result.ok) return false;
      try {
        storage.setItem(key, JSON.stringify(result.value));
        return true;
      } catch {
        return false;
      }
    },
  };
}
