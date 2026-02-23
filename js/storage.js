/**
 * @fileoverview StorageService — the only module that touches localStorage.
 *
 * Swapping the storage backend in the future (e.g. IndexedDB, REST API) only
 * requires changes here; all other modules remain untouched.
 */

const STORAGE_KEY = 'todos';

/**
 * Load all todos from localStorage.
 * Returns an empty array if no data exists or the stored value is corrupt JSON.
 *
 * @returns {import('./todoManager.js').Todo[]}
 */
export function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn(
      '[StorageService] Corrupt data found in localStorage — starting with an empty list.',
      e
    );
    return [];
  }
}

/**
 * Persist the full todos array to localStorage.
 * Re-throws any storage error (e.g. QuotaExceededError) so the caller can
 * surface appropriate UI feedback.
 *
 * @param {import('./todoManager.js').Todo[]} todos
 */
export function save(todos) {
  // Intentionally not swallowing errors — callers handle QuotaExceededError.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}
