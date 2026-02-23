/**
 * @fileoverview app.js — Application entry point.
 *
 * Task 7: Core Wiring (Init + Add)
 * Task 8: Event Delegation — Toggle & Delete
 *
 * Orchestrates app startup: initialises state from storage, renders the
 * initial todo list, and wires the "Add" button and Enter-key to create new
 * todos. Attaches a single delegated click listener to #todo-list to handle
 * toggle and delete actions without re-registering after re-renders.
 *
 * Contains no business logic and no direct localStorage access.
 *
 * Error handling at this stage:
 *   - ValidationError → console.warn  (full UI feedback added in Task 9)
 *   - Storage errors  → console.error (full UI feedback added in Task 9)
 */

import {
  init,
  addTodo,
  getSortedTodos,
  toggleTodo,
  deleteTodo,
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

// ─── Delegated list action handler ───────────────────────────────────────────

/**
 * Single delegated click handler attached to #todo-list.
 *
 * Inspects the click target to determine which action to take:
 *   - Checkbox with data-id  → toggleTodo(id) + re-render
 *   - [data-action="delete"] → deleteTodo(id) + re-render
 *
 * Using closest('[data-id]') on the delete path lets clicks on any child
 * element inside the button still resolve to the correct todo id.
 *
 * This listener is attached exactly once at bootstrap and continues to work
 * correctly after full re-renders because it is registered on the stable
 * #todo-list container, not on individual child elements.
 *
 * @param {MouseEvent} event
 */
function handleListClick(event) {
  const target = event.target;

  // ── Checkbox toggle ────────────────────────────────────────────────────────
  if (
    target instanceof HTMLInputElement &&
    target.type === 'checkbox' &&
    target.dataset.id
  ) {
    const sorted = toggleTodo(target.dataset.id);
    renderTodos(sorted);
    return;
  }

  // ── Delete button ──────────────────────────────────────────────────────────
  // Use closest() so that clicks on child elements of the button still work.
  const deleteEl = target.closest('[data-action="delete"]');
  if (deleteEl && deleteEl.dataset.id) {
    const sorted = deleteTodo(deleteEl.dataset.id);
    renderTodos(sorted);
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

  // Delegated listener for toggle and delete — attached once to the stable
  // #todo-list container so it survives full re-renders of its children.
  const todoList = document.getElementById('todo-list');
  if (todoList) {
    todoList.addEventListener('click', handleListClick);
  }
});
