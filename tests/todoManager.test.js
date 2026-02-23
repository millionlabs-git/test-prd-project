/**
 * @fileoverview Unit tests for TodoManager (js/todoManager.js).
 *
 * Each test resets localStorage and re-initialises the module so tests are
 * fully isolated from one another.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  init,
  addTodo,
  deleteTodo,
  toggleTodo,
  getSortedTodos,
  ValidationError,
} from '../js/todoManager.js';

describe('TodoManager', () => {
  beforeEach(() => {
    // Wipe storage and reset the in-memory array via init().
    localStorage.clear();
    init();
  });

  // ── init() ────────────────────────────────────────────────────────────────

  describe('init()', () => {
    it('starts with an empty list when localStorage is empty', () => {
      expect(getSortedTodos()).toEqual([]);
    });

    it('hydrates from a previously persisted list', () => {
      const stored = [
        { id: '1', text: 'Persisted todo', completed: false, createdAt: 1000 },
      ];
      localStorage.setItem('todos', JSON.stringify(stored));

      init(); // re-initialise after seeding storage

      expect(getSortedTodos()).toEqual(stored);
    });
  });

  // ── addTodo() ─────────────────────────────────────────────────────────────

  describe('addTodo()', () => {
    it('returns a list containing the new todo', () => {
      const result = addTodo('Buy milk');
      expect(result).toHaveLength(1);
    });

    it('creates a todo with the correct structure', () => {
      const [todo] = addTodo('Buy milk');

      expect(todo.text).toBe('Buy milk');
      expect(todo.completed).toBe(false);
      expect(typeof todo.id).toBe('string');
      expect(todo.id.length).toBeGreaterThan(0);
      expect(typeof todo.createdAt).toBe('number');
    });

    it('trims leading and trailing whitespace from text', () => {
      const [todo] = addTodo('  Hello World  ');
      expect(todo.text).toBe('Hello World');
    });

    it('throws ValidationError for an empty string', () => {
      expect(() => addTodo('')).toThrow(ValidationError);
    });

    it('throws ValidationError for whitespace-only input', () => {
      expect(() => addTodo('   ')).toThrow(ValidationError);
    });

    it('does not mutate the list when validation fails', () => {
      try {
        addTodo('');
      } catch {
        // swallow
      }
      expect(getSortedTodos()).toHaveLength(0);
    });

    it('persists the new todo to localStorage', () => {
      addTodo('Buy milk');
      const stored = JSON.parse(localStorage.getItem('todos'));
      expect(stored).toHaveLength(1);
      expect(stored[0].text).toBe('Buy milk');
    });

    it('prepends new todos so the newest appears first', () => {
      addTodo('First');
      addTodo('Second');
      const [first] = getSortedTodos();
      expect(first.text).toBe('Second');
    });
  });

  // ── deleteTodo() ──────────────────────────────────────────────────────────

  describe('deleteTodo()', () => {
    it('removes the todo with the matching id', () => {
      const [todo] = addTodo('Delete me');
      const result = deleteTodo(todo.id);
      expect(result.find((t) => t.id === todo.id)).toBeUndefined();
    });

    it('returns the remaining todos after deletion', () => {
      addTodo('Keep me');
      const [toDelete] = addTodo('Delete me');
      const result = deleteTodo(toDelete.id);
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Keep me');
    });

    it('is a silent no-op when the id is not found', () => {
      addTodo('Keep me');
      const before = getSortedTodos();
      const result = deleteTodo('nonexistent-id');
      expect(result).toEqual(before);
    });

    it('persists the deletion to localStorage', () => {
      const [todo] = addTodo('To delete');
      deleteTodo(todo.id);
      const stored = JSON.parse(localStorage.getItem('todos'));
      expect(stored.find((t) => t.id === todo.id)).toBeUndefined();
    });
  });

  // ── toggleTodo() ──────────────────────────────────────────────────────────

  describe('toggleTodo()', () => {
    it('marks an incomplete todo as complete', () => {
      const [todo] = addTodo('Toggle me');
      const result = toggleTodo(todo.id);
      const toggled = result.find((t) => t.id === todo.id);
      expect(toggled.completed).toBe(true);
    });

    it('marks a completed todo back as incomplete', () => {
      const [todo] = addTodo('Toggle twice');
      toggleTodo(todo.id); // → complete
      const result = toggleTodo(todo.id); // → incomplete
      const toggled = result.find((t) => t.id === todo.id);
      expect(toggled.completed).toBe(false);
    });

    it('is a silent no-op when the id is not found', () => {
      addTodo('Unchanged');
      const before = getSortedTodos();
      const result = toggleTodo('nonexistent-id');
      expect(result).toEqual(before);
    });

    it('persists the toggle to localStorage', () => {
      const [todo] = addTodo('Persist toggle');
      toggleTodo(todo.id);
      const stored = JSON.parse(localStorage.getItem('todos'));
      expect(stored.find((t) => t.id === todo.id).completed).toBe(true);
    });
  });

  // ── getSortedTodos() ──────────────────────────────────────────────────────

  describe('getSortedTodos()', () => {
    it('places all incomplete todos before any completed todo', () => {
      addTodo('A');
      addTodo('B');
      addTodo('C');
      const [newest] = getSortedTodos();
      toggleTodo(newest.id); // complete the newest

      const sorted = getSortedTodos();
      const completedIndex = sorted.findIndex((t) => t.completed);
      const incompleteAfterCompleted = sorted
        .slice(completedIndex + 1)
        .some((t) => !t.completed);

      expect(completedIndex).toBe(sorted.length - 1); // completed is last
      expect(incompleteAfterCompleted).toBe(false);
    });

    it('sorts incomplete todos newest first (descending createdAt)', () => {
      addTodo('Older');
      addTodo('Newer'); // added later → higher createdAt
      const sorted = getSortedTodos();
      expect(sorted[0].createdAt).toBeGreaterThanOrEqual(sorted[1].createdAt);
    });

    it('returns a defensive copy — mutating the result does not affect state', () => {
      addTodo('Only todo');
      const result = getSortedTodos();
      result.push({ id: 'fake', text: 'Injected', completed: false, createdAt: 0 });
      expect(getSortedTodos()).toHaveLength(1);
    });

    it('returns an empty array when there are no todos', () => {
      expect(getSortedTodos()).toEqual([]);
    });
  });
});
