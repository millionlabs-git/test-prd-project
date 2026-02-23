/**
 * @fileoverview app.js — Application entry point.
 *
 * Task 7: Core Wiring (Init + Add)
 *
 * Orchestrates app startup: initialises state from storage, renders the
 * initial todo list, and wires the "Add" button and Enter-key to create new
 * todos. Contains no business logic and no direct localStorage access.
 *
 * Error handling at this stage:
 *   - ValidationError → console.warn  (full UI feedback added in Task 8)
 *   - Storage errors  → console.error (full UI feedback added in Task 9)
 */

import {
  init,
  addTodo,
  getSortedTodos,
  ValidationError,
} from './todoManager.js';
import { renderTodos, clearInput } from './uiRenderer.js';

// ─── Core action handler ──────────────────────────────────────────────────────

/**
 * Read the current input value, attempt to add the todo, then re-render.
 *
 * On success: re-renders the list with the returned sorted todos and clears
 * the input field.
 *
 * On failure:
 *   - ValidationError → console.warn (Task 8 will add UI feedback)
 *   - Storage error   → console.error (Task 9 will add UI feedback)
 */
function handleAdd() {
  const input = document.getElementById('new-todo-input');
  if (!input) return;

  try {
    const sorted = addTodo(input.value);
    renderTodos(sorted);
    clearInput();
  } catch (e) {
    if (e instanceof ValidationError) {
      console.warn('[app] Validation error:', e.message);
    } else {
      console.error('[app] Storage error during addTodo:', e);
    }
  }
}

// ─── Bootstrapping ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Hydrate state from localStorage and paint the initial list.
  init();
  renderTodos(getSortedTodos());

  // "Add" button — click to create a new todo.
  const addBtn = document.getElementById('add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', handleAdd);
  }

  // Input field — pressing Enter also creates a new todo.
  const inputEl = document.getElementById('new-todo-input');
  if (inputEl) {
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAdd();
    });
  }
});
