/**
 * @fileoverview Unit tests for StorageService (js/storage.js).
 *
 * jsdom provides a functional localStorage implementation, so no manual
 * mocking is needed for the happy paths.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { load, save } from '../js/storage.js';

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── load() ────────────────────────────────────────────────────────────────

  describe('load()', () => {
    it('returns [] when no "todos" key exists in localStorage', () => {
      expect(load()).toEqual([]);
    });

    it('returns [] and logs a console.warn when data is corrupt JSON', () => {
      localStorage.setItem('todos', 'not-valid-json!!');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = load();

      expect(result).toEqual([]);
      expect(warnSpy).toHaveBeenCalledOnce();
    });

    it('returns the correct Todo[] when valid JSON is stored', () => {
      const todos = [
        { id: '1', text: 'Buy groceries', completed: false, createdAt: 1000 },
        { id: '2', text: 'Read a book', completed: true, createdAt: 2000 },
      ];
      localStorage.setItem('todos', JSON.stringify(todos));

      expect(load()).toEqual(todos);
    });

    it('returns [] when stored value is valid JSON but not an array', () => {
      localStorage.setItem('todos', JSON.stringify({ foo: 'bar' }));
      expect(load()).toEqual([]);
    });

    it('returns [] when stored value is valid JSON null', () => {
      localStorage.setItem('todos', 'null');
      expect(load()).toEqual([]);
    });
  });

  // ── save() ────────────────────────────────────────────────────────────────

  describe('save()', () => {
    it('writes todos that round-trip correctly through load()', () => {
      const todos = [
        { id: '1', text: 'Buy milk', completed: false, createdAt: 1000 },
        { id: '2', text: 'Read book', completed: true, createdAt: 2000 },
      ];
      save(todos);

      expect(load()).toEqual(todos);
    });

    it('overwrites any previously stored data', () => {
      save([{ id: '1', text: 'Old', completed: false, createdAt: 1 }]);
      save([{ id: '2', text: 'New', completed: false, createdAt: 2 }]);

      expect(load()).toEqual([
        { id: '2', text: 'New', completed: false, createdAt: 2 },
      ]);
    });

    it('saves an empty array correctly', () => {
      save([]);
      expect(load()).toEqual([]);
    });

    it('re-throws DOMException when localStorage.setItem throws', () => {
      const setItemSpy = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new DOMException('QuotaExceededError');
        });

      expect(() =>
        save([{ id: '1', text: 'Test', completed: false, createdAt: 1000 }])
      ).toThrow(DOMException);

      setItemSpy.mockRestore();
    });
  });
});
