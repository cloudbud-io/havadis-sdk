import type { KeysetPage } from '../types.js';

export interface ListOptions {
  limit?: number;
  cursor?: string;
  signal?: AbortSignal;
}

/**
 * Keyset auto-pagination: wraps a page fetcher into an async iterable of
 * items. The server's strict-cursor rule (a malformed cursor is a 400,
 * never a silent first page) is what makes this loop safe from repeating
 * or spinning — the SDK only ever feeds back cursors the server minted.
 */
export function paginate<T>(
  fetchPage: (cursor: string | undefined) => Promise<KeysetPage<T>>,
): AsyncIterable<T> & { pages(): AsyncIterable<KeysetPage<T>> } {
  async function* pages(): AsyncGenerator<KeysetPage<T>> {
    let cursor: string | undefined = undefined;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page: KeysetPage<T> = await fetchPage(cursor);
      yield page;
      if (!page.has_more || !page.next_cursor) return;
      cursor = page.next_cursor;
    }
  }
  async function* items(): AsyncGenerator<T> {
    for await (const page of pages()) {
      for (const item of page.data) yield item;
    }
  }
  return {
    [Symbol.asyncIterator]: items,
    pages,
  };
}
