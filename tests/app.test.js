/**
 * @fileoverview Unit tests for app.js — Core Wiring (Init + Add).
 *
 * Strategy
 * --------
 * app.js has no exports; its entire behaviour is triggered by DOM events.
 * We therefore:
 *   1. Mock both dependency modules before importing app.js.
 *      • For todoManager we use vi.importActual so the real ValidationError
 *        class is preserved (fixing vi.mock hoisting name-collision issues).
 *   2. Import app.js once — this registers the DOMContentLoaded listener.
 *   3. In each test group's beforeEach, set up a fresh minimal DOM, then
 *      dispatch DOMContentLoaded to let the bootstrap code attach handlers.
 *   4. Clear mock call records *after* the bootstrap dispatch so that
 *      interaction tests begin with zero recorded calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock dependencies ────────────────────────────────────────────────────────
// vi.mock calls are hoisted before all imports by Vitest's transform.
// Using vi.importActual inside the factory keeps the real ValidationError class
// (avoids the "top-level variable" hoisting collision with static imports).

vi.mock('../js/todoManager.js', async () => {
  // Import the real module so we can reuse its ValidationError class.
  const actual = await vi.importActual('../js/todoManager.js');
  return {
    ...actual,          // preserves ValidationError (and any other exports)
    init: vi.fn(),
    addTodo: vi.fn(() => []),
    getSortedTodos: vi.fn(() => []),
    toggleTodo: vi.fn(() => []),
    deleteTodo: vi.fn(() => []),
  };
});

vi.mock('../js/uiRenderer.js', () => ({
  renderTodos: vi.fn(),
  clearInput: vi.fn(),
}));

// ─── Import mocked modules + app.js ──────────────────────────────────────────

import {
  init,
  addTodo,
  getSortedTodos,
  toggleTodo,
  deleteTodo,
  ValidationError,
} from '../js/todoManager.js';

import { renderTodos, clearInput } from '../js/uiRenderer.js';

// Importing app.js registers the DOMContentLoaded listener once.
// Dispatching the event in tests fires that listener.
import '../js/app.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Provide a minimal DOM that mirrors the structure in index.html. */
function setupDOM() {
  document.body.innerHTML = `
    <input id="new-todo-input" type="text" value="" />
    <button id="add-btn">Add</button>
    <ul id="todo-list"></ul>
  `;
}

/** Fire DOMContentLoaded so app.js runs its bootstrap block. */
function bootApp() {
  document.dispatchEvent(new Event('DOMContentLoaded'));
}

/** Clear call records on every mock (does not reset implementations). */
function clearMockCalls() {
  init.mockClear();
  addTodo.mockClear();
  getSortedTodos.mockClear();
  toggleTodo.mockClear();
  deleteTodo.mockClear();
  renderTodos.mockClear();
  clearInput.mockClear();
}

/**
 * Build a minimal todo <li> element matching the structure produced by
 * uiRenderer.buildTodoElement(), so delegated-listener tests can simulate
 * real user interactions without depending on the renderer.
 *
 * @param {{ id: string, completed?: boolean, text?: string }} opts
 * @returns {HTMLLIElement}
 */
function buildFakeTodoLi({ id, completed = false, text = 'Test todo' }) {
  const li = document.createElement('li');

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = completed;
  checkbox.dataset.id = id;

  const span = document.createElement('span');
  span.textContent = text;

  const deleteBtn = document.createElement('button');
  deleteBtn.dataset.id = id;
  deleteBtn.dataset.action = 'delete';
  deleteBtn.textContent = '✕';

  li.appendChild(checkbox);
  li.appendChild(span);
  li.appendChild(deleteBtn);
  return li;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('app.js — Core Wiring (Init + Add)', () => {
  // ── DOMContentLoaded bootstrapping ────────────────────────────────────────

  describe('on DOMContentLoaded', () => {
    beforeEach(() => {
      setupDOM();
      bootApp();
      // Do NOT clear calls here — these tests assert the bootstrap itself.
    });

    it('calls init() exactly once to hydrate state from storage', () => {
      expect(init).toHaveBeenCalledOnce();
    });

    it('calls getSortedTodos() to obtain the initial list', () => {
      expect(getSortedTodos).toHaveBeenCalled();
    });

    it('calls renderTodos() with the value returned by getSortedTodos()', () => {
      // Default mock returns []; verify that value is forwarded to the renderer.
      expect(renderTodos).toHaveBeenCalledWith([]);
    });

    it('renders a pre-existing todo list on page load', () => {
      const stored = [
        { id: '1', text: 'Persisted task', completed: false, createdAt: 1000 },
      ];
      getSortedTodos.mockReturnValue(stored);

      // Re-dispatch so the bootstrap code picks up the new return value.
      setupDOM();
      bootApp();

      expect(renderTodos).toHaveBeenLastCalledWith(stored);
    });

    it('renders an empty list when localStorage has no todos', () => {
      getSortedTodos.mockReturnValue([]);
      setupDOM();
      bootApp();

      expect(renderTodos).toHaveBeenLastCalledWith([]);
    });
  });

  // ── #add-btn click ────────────────────────────────────────────────────────

  describe('#add-btn click', () => {
    let input, addBtn;

    beforeEach(() => {
      setupDOM();
      bootApp();
      // Clear initialization calls so button-click tests start with 0 records.
      clearMockCalls();
      addTodo.mockReturnValue([]);

      input = document.getElementById('new-todo-input');
      addBtn = document.getElementById('add-btn');
    });

    it('calls addTodo() with the current input value', () => {
      input.value = 'Buy milk';
      addBtn.click();

      expect(addTodo).toHaveBeenCalledWith('Buy milk');
    });

    it('passes the sorted list returned by addTodo() to renderTodos()', () => {
      const newList = [
        { id: '1', text: 'Buy milk', completed: false, createdAt: 2000 },
      ];
      addTodo.mockReturnValue(newList);
      input.value = 'Buy milk';
      addBtn.click();

      expect(renderTodos).toHaveBeenCalledWith(newList);
    });

    it('calls clearInput() after a successful add', () => {
      input.value = 'Clean the house';
      addBtn.click();

      expect(clearInput).toHaveBeenCalledOnce();
    });

    it('newly added todo appears first in the rendered list', () => {
      const sortedWithNew = [
        { id: '2', text: 'Newer task', completed: false, createdAt: 2000 },
        { id: '1', text: 'Older task', completed: false, createdAt: 1000 },
      ];
      addTodo.mockReturnValue(sortedWithNew);
      input.value = 'Newer task';
      addBtn.click();

      const renderedList = renderTodos.mock.calls[0][0];
      expect(renderedList[0].text).toBe('Newer task');
    });

    it('does NOT call renderTodos() or clearInput() on ValidationError', () => {
      addTodo.mockImplementation(() => {
        throw new ValidationError('empty');
      });
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      input.value = '';
      addBtn.click();

      expect(renderTodos).not.toHaveBeenCalled();
      expect(clearInput).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('does NOT call renderTodos() or clearInput() on a storage error', () => {
      addTodo.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      input.value = 'Something';
      addBtn.click();

      expect(renderTodos).not.toHaveBeenCalled();
      expect(clearInput).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  // ── #new-todo-input Enter key ─────────────────────────────────────────────

  describe('#new-todo-input Enter key', () => {
    let input;

    beforeEach(() => {
      setupDOM();
      bootApp();
      clearMockCalls();
      addTodo.mockReturnValue([]);

      input = document.getElementById('new-todo-input');
    });

    /** Dispatch a keydown event on the input element. */
    function pressKey(key) {
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true })
      );
    }

    it('calls addTodo() with the input value when Enter is pressed', () => {
      input.value = 'Task via Enter';
      pressKey('Enter');

      expect(addTodo).toHaveBeenCalledWith('Task via Enter');
    });

    it('passes the sorted list returned by addTodo() to renderTodos()', () => {
      const newList = [
        { id: '3', text: 'Task via Enter', completed: false, createdAt: 3000 },
      ];
      addTodo.mockReturnValue(newList);
      input.value = 'Task via Enter';
      pressKey('Enter');

      expect(renderTodos).toHaveBeenCalledWith(newList);
    });

    it('calls clearInput() after a successful add via Enter', () => {
      input.value = 'Enter task';
      pressKey('Enter');

      expect(clearInput).toHaveBeenCalledOnce();
    });

    it('does NOT trigger addTodo() for Tab key', () => {
      input.value = 'Something';
      pressKey('Tab');

      expect(addTodo).not.toHaveBeenCalled();
    });

    it('does NOT trigger addTodo() for Space key', () => {
      input.value = 'Something';
      pressKey(' ');

      expect(addTodo).not.toHaveBeenCalled();
    });

    it('does NOT trigger addTodo() for Escape key', () => {
      input.value = 'Something';
      pressKey('Escape');

      expect(addTodo).not.toHaveBeenCalled();
    });
  });

  // ── ValidationError handling ──────────────────────────────────────────────

  describe('ValidationError handling', () => {
    let input, addBtn;

    beforeEach(() => {
      setupDOM();
      bootApp();
      clearMockCalls();

      addTodo.mockImplementation(() => {
        throw new ValidationError('Todo text cannot be empty.');
      });

      input = document.getElementById('new-todo-input');
      addBtn = document.getElementById('add-btn');
    });

    it('calls console.warn() when a ValidationError is thrown via button', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      input.value = '';
      addBtn.click();

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('calls console.warn() when a ValidationError is thrown via Enter', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      input.value = '   ';
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      );

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('does NOT call console.error() for a ValidationError', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      input.value = '   ';
      addBtn.click();

      expect(errorSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  // ── Storage error handling ────────────────────────────────────────────────

  describe('storage error handling', () => {
    let input, addBtn;
    let storageError;

    beforeEach(() => {
      setupDOM();
      bootApp();
      clearMockCalls();

      storageError = new Error('QuotaExceededError');
      addTodo.mockImplementation(() => {
        throw storageError;
      });

      input = document.getElementById('new-todo-input');
      addBtn = document.getElementById('add-btn');
    });

    it('calls console.error() when addTodo throws a non-ValidationError', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      input.value = 'Some todo';
      addBtn.click();

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('includes the original error object in the console.error call', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      input.value = 'Some todo';
      addBtn.click();

      // The actual Error object must be forwarded, not just a string.
      const allArgs = errorSpy.mock.calls.flat();
      expect(allArgs).toContain(storageError);
      errorSpy.mockRestore();
    });

    it('does NOT call console.warn() for a generic storage error', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      input.value = 'Some todo';
      addBtn.click();

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  // ── Graceful degradation (missing DOM elements) ───────────────────────────

  describe('graceful degradation', () => {
    it('does not throw during bootstrap when #new-todo-input is absent', () => {
      // Page with only the button — simulates a broken/partial DOM.
      document.body.innerHTML = `<button id="add-btn">Add</button>`;

      // bootApp() should not throw even though the input element is missing.
      expect(() => bootApp()).not.toThrow();
    });

    it('does not throw on add-btn click when #new-todo-input is absent', () => {
      document.body.innerHTML = `<button id="add-btn">Add</button>`;
      bootApp();

      // handleAdd() guards against a missing input — should be a silent no-op.
      expect(() =>
        document.getElementById('add-btn').click()
      ).not.toThrow();
    });

    it('does not throw during bootstrap when #add-btn is absent', () => {
      document.body.innerHTML = `<input id="new-todo-input" type="text" />`;

      expect(() => bootApp()).not.toThrow();
    });
  });
});

// ─── Event Delegation — Toggle & Delete ──────────────────────────────────────

describe('app.js — Event Delegation (Toggle & Delete)', () => {
  let todoList;

  beforeEach(() => {
    setupDOM();
    bootApp();
    clearMockCalls();

    todoList = document.getElementById('todo-list');
    // Default mock return values for action handlers.
    toggleTodo.mockReturnValue([]);
    deleteTodo.mockReturnValue([]);
  });

  // ── Checkbox / toggle ──────────────────────────────────────────────────────

  describe('checkbox click — toggleTodo', () => {
    it('calls toggleTodo() with the todo id when a checkbox is clicked', () => {
      todoList.appendChild(buildFakeTodoLi({ id: 'abc-1' }));
      const checkbox = todoList.querySelector('input[type="checkbox"]');
      checkbox.click();

      expect(toggleTodo).toHaveBeenCalledOnce();
      expect(toggleTodo).toHaveBeenCalledWith('abc-1');
    });

    it('calls renderTodos() with the list returned by toggleTodo()', () => {
      const updated = [
        { id: 'abc-1', text: 'Test todo', completed: true, createdAt: 1000 },
      ];
      toggleTodo.mockReturnValue(updated);

      todoList.appendChild(buildFakeTodoLi({ id: 'abc-1' }));
      todoList.querySelector('input[type="checkbox"]').click();

      expect(renderTodos).toHaveBeenCalledOnce();
      expect(renderTodos).toHaveBeenCalledWith(updated);
    });

    it('does NOT call deleteTodo() when a checkbox is clicked', () => {
      todoList.appendChild(buildFakeTodoLi({ id: 'abc-1' }));
      todoList.querySelector('input[type="checkbox"]').click();

      expect(deleteTodo).not.toHaveBeenCalled();
    });

    it('toggles an already-completed todo (un-complete path)', () => {
      todoList.appendChild(buildFakeTodoLi({ id: 'abc-2', completed: true }));
      const checkbox = todoList.querySelector('input[type="checkbox"]');
      checkbox.click();

      expect(toggleTodo).toHaveBeenCalledWith('abc-2');
    });

    it('toggles the correct todo when multiple items are in the list', () => {
      todoList.appendChild(buildFakeTodoLi({ id: 'first' }));
      todoList.appendChild(buildFakeTodoLi({ id: 'second' }));

      const checkboxes = todoList.querySelectorAll('input[type="checkbox"]');
      checkboxes[1].click(); // click the second one

      expect(toggleTodo).toHaveBeenCalledWith('second');
      expect(toggleTodo).not.toHaveBeenCalledWith('first');
    });

    it('does nothing when a checkbox with no data-id is clicked', () => {
      // Rogue checkbox without a data-id.
      const rogue = document.createElement('input');
      rogue.type = 'checkbox';
      todoList.appendChild(rogue);
      rogue.click();

      expect(toggleTodo).not.toHaveBeenCalled();
      expect(renderTodos).not.toHaveBeenCalled();
    });
  });

  // ── Delete button ──────────────────────────────────────────────────────────

  describe('delete button click — deleteTodo', () => {
    it('calls deleteTodo() with the todo id when the delete button is clicked', () => {
      todoList.appendChild(buildFakeTodoLi({ id: 'xyz-9' }));
      const btn = todoList.querySelector('[data-action="delete"]');
      btn.click();

      expect(deleteTodo).toHaveBeenCalledOnce();
      expect(deleteTodo).toHaveBeenCalledWith('xyz-9');
    });

    it('calls renderTodos() with the list returned by deleteTodo()', () => {
      const afterDelete = [
        { id: 'xyz-10', text: 'Remaining', completed: false, createdAt: 2000 },
      ];
      deleteTodo.mockReturnValue(afterDelete);

      todoList.appendChild(buildFakeTodoLi({ id: 'xyz-9' }));
      todoList.querySelector('[data-action="delete"]').click();

      expect(renderTodos).toHaveBeenCalledWith(afterDelete);
    });

    it('does NOT call toggleTodo() when a delete button is clicked', () => {
      todoList.appendChild(buildFakeTodoLi({ id: 'xyz-9' }));
      todoList.querySelector('[data-action="delete"]').click();

      expect(toggleTodo).not.toHaveBeenCalled();
    });

    it('deletes the correct todo when multiple items are in the list', () => {
      todoList.appendChild(buildFakeTodoLi({ id: 'item-a' }));
      todoList.appendChild(buildFakeTodoLi({ id: 'item-b' }));

      const buttons = todoList.querySelectorAll('[data-action="delete"]');
      buttons[0].click(); // click the first delete button

      expect(deleteTodo).toHaveBeenCalledWith('item-a');
      expect(deleteTodo).not.toHaveBeenCalledWith('item-b');
    });

    it('handles a click on a child element inside the delete button via closest()', () => {
      // Simulate a button that contains an inner <span> (child element).
      const li = buildFakeTodoLi({ id: 'nested-1' });
      const btn = li.querySelector('[data-action="delete"]');
      const innerIcon = document.createElement('span');
      innerIcon.textContent = '×';
      btn.appendChild(innerIcon);
      todoList.appendChild(li);

      // Click the inner <span>, not the button itself.
      innerIcon.click();

      expect(deleteTodo).toHaveBeenCalledWith('nested-1');
    });
  });

  // ── Neutral clicks (no action taken) ──────────────────────────────────────

  describe('neutral clicks — no action', () => {
    it('does not call toggleTodo() or deleteTodo() when clicking the list container', () => {
      todoList.click();

      expect(toggleTodo).not.toHaveBeenCalled();
      expect(deleteTodo).not.toHaveBeenCalled();
    });

    it('does not call toggleTodo() or deleteTodo() when clicking a text span', () => {
      todoList.appendChild(buildFakeTodoLi({ id: 'span-test' }));
      const span = todoList.querySelector('span');
      span.click();

      expect(toggleTodo).not.toHaveBeenCalled();
      expect(deleteTodo).not.toHaveBeenCalled();
    });
  });

  // ── Listener survives re-renders ───────────────────────────────────────────

  describe('listener survives re-renders', () => {
    it('still handles toggle after renderTodos replaces #todo-list children', () => {
      // Simulate an initial add that triggers a full re-render.
      todoList.innerHTML = ''; // wipe
      todoList.appendChild(buildFakeTodoLi({ id: 're-render-1' }));

      // Click the checkbox in the freshly rendered content.
      todoList.querySelector('input[type="checkbox"]').click();

      expect(toggleTodo).toHaveBeenCalledWith('re-render-1');
    });

    it('still handles delete after renderTodos replaces #todo-list children', () => {
      // Simulate re-render by replacing innerHTML.
      todoList.innerHTML = '';
      todoList.appendChild(buildFakeTodoLi({ id: 're-render-2' }));

      todoList.querySelector('[data-action="delete"]').click();

      expect(deleteTodo).toHaveBeenCalledWith('re-render-2');
    });
  });

  // ── Graceful degradation ───────────────────────────────────────────────────

  describe('graceful degradation', () => {
    it('does not throw during bootstrap when #todo-list is absent', () => {
      document.body.innerHTML = `
        <input id="new-todo-input" type="text" />
        <button id="add-btn">Add</button>
      `;
      // No #todo-list — bootstrap should guard and not throw.
      expect(() => bootApp()).not.toThrow();
    });
  });
});
