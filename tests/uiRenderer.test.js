/**
 * @fileoverview Unit tests for UIRenderer (js/uiRenderer.js).
 *
 * Uses jsdom (via vitest's jsdom environment) to provide a real DOM.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderTodos, buildTodoElement, clearInput } from '../js/uiRenderer.js';

/** Helper: create a minimal todo fixture. */
function makeTodo(overrides = {}) {
  return {
    id: 'test-id',
    text: 'Test todo',
    completed: false,
    createdAt: 1000,
    ...overrides,
  };
}

describe('UIRenderer', () => {
  beforeEach(() => {
    // Provide a fresh, minimal DOM for each test.
    document.body.innerHTML = `
      <ul id="todo-list"></ul>
      <input id="new-todo-input" type="text" value="pre-filled" />
    `;
  });

  // ── buildTodoElement() ────────────────────────────────────────────────────

  describe('buildTodoElement()', () => {
    it('returns an <li> element', () => {
      const li = buildTodoElement(makeTodo());
      expect(li.tagName).toBe('LI');
    });

    it('contains a checkbox, a span, and a delete button', () => {
      const li = buildTodoElement(makeTodo());
      expect(li.querySelector('input[type="checkbox"]')).toBeTruthy();
      expect(li.querySelector('span')).toBeTruthy();
      expect(li.querySelector('button')).toBeTruthy();
    });

    it('sets the correct text content on the span', () => {
      const li = buildTodoElement(makeTodo({ text: 'Hello World' }));
      expect(li.querySelector('span').textContent).toBe('Hello World');
    });

    it('sets data-id on the checkbox matching the todo id', () => {
      const li = buildTodoElement(makeTodo({ id: 'abc-123' }));
      expect(li.querySelector('input[type="checkbox"]').dataset.id).toBe(
        'abc-123'
      );
    });

    it('sets data-id on the delete button matching the todo id', () => {
      const li = buildTodoElement(makeTodo({ id: 'abc-123' }));
      expect(li.querySelector('button').dataset.id).toBe('abc-123');
    });

    it('sets data-action="delete" on the delete button', () => {
      const li = buildTodoElement(makeTodo());
      expect(li.querySelector('button').dataset.action).toBe('delete');
    });

    it('checkbox is unchecked for an incomplete todo', () => {
      const li = buildTodoElement(makeTodo({ completed: false }));
      expect(li.querySelector('input[type="checkbox"]').checked).toBe(false);
    });

    it('checkbox is checked for a completed todo', () => {
      const li = buildTodoElement(makeTodo({ completed: true }));
      expect(li.querySelector('input[type="checkbox"]').checked).toBe(true);
    });

    it('does NOT apply .completed-text to an incomplete todo span', () => {
      const li = buildTodoElement(makeTodo({ completed: false }));
      expect(li.querySelector('span').classList.contains('completed-text')).toBe(
        false
      );
    });

    it('applies .completed-text to a completed todo span', () => {
      const li = buildTodoElement(makeTodo({ completed: true }));
      expect(li.querySelector('span').classList.contains('completed-text')).toBe(
        true
      );
    });
  });

  // ── renderTodos() ─────────────────────────────────────────────────────────

  describe('renderTodos()', () => {
    it('leaves the list empty when given an empty array', () => {
      renderTodos([]);
      expect(document.getElementById('todo-list').children.length).toBe(0);
    });

    it('renders one <li> per todo', () => {
      renderTodos([makeTodo({ id: '1' }), makeTodo({ id: '2' })]);
      expect(document.getElementById('todo-list').children.length).toBe(2);
    });

    it('clears previously rendered items before re-rendering', () => {
      renderTodos([makeTodo({ id: '1' })]);
      renderTodos([]); // re-render with empty list
      expect(document.getElementById('todo-list').children.length).toBe(0);
    });

    it('renders todos in the order provided', () => {
      const todos = [
        makeTodo({ id: 'first', text: 'First' }),
        makeTodo({ id: 'second', text: 'Second' }),
      ];
      renderTodos(todos);
      const items = document.querySelectorAll('#todo-list li');
      expect(items[0].querySelector('span').textContent).toBe('First');
      expect(items[1].querySelector('span').textContent).toBe('Second');
    });

    it('handles gracefully when #todo-list is absent (no throw)', () => {
      document.body.innerHTML = ''; // remove the list
      expect(() => renderTodos([makeTodo()])).not.toThrow();
    });
  });

  // ── clearInput() ──────────────────────────────────────────────────────────

  describe('clearInput()', () => {
    it('sets #new-todo-input value to an empty string', () => {
      clearInput();
      expect(document.getElementById('new-todo-input').value).toBe('');
    });

    it('handles gracefully when #new-todo-input is absent (no throw)', () => {
      document.body.innerHTML = '';
      expect(() => clearInput()).not.toThrow();
    });
  });
});
