/**
 * @fileoverview app.js — Application entry point.
 *
 * Orchestrates the app: initialises state, wires event listeners, and bridges
 * user actions between TodoManager and UIRenderer. Contains no business logic
 * and no direct localStorage access.
 */

import {
  init,
  addTodo,
  deleteTodo,
  toggleTodo,
  getSortedTodos,
  ValidationError,
} from './todoManager.js';
import { renderTodos, clearInput } from './uiRenderer.js';

// ─── Error UI helpers ─────────────────────────────────────────────────────────

/**
 * Briefly apply a red-ring error class to the input for 600 ms, then remove it.
 */
function flashInputError() {
  const input = document.getElementById('new-todo-input');
  if (!input) return;
  input.classList.add('input-error');
  setTimeout(() => input.classList.remove('input-error'), 600);
}

/**
 * Show a non-blocking "storage full" error message for 4 s.
 * Only one message is displayed at a time — a second call replaces any
 * currently-visible message rather than stacking duplicates.
 */
function showStorageError() {
  const container = document.getElementById('storage-error-container');
  if (!container) return;

  // Remove any existing message before creating a new one.
  const existing = document.getElementById('storage-error');
  if (existing) existing.remove();

  const msg = document.createElement('p');
  msg.id = 'storage-error';
  msg.textContent = 'Could not save — storage is full.';
  container.appendChild(msg);

  setTimeout(() => msg.remove(), 4000);
}

// ─── Core action handler ──────────────────────────────────────────────────────

/**
 * Read the current input value, attempt to add the todo, then re-render.
 * Provides visible UI feedback for both ValidationError and storage errors.
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
      flashInputError();
    } else {
      console.error('[app] Storage error during addTodo:', e);
      showStorageError();
    }
  }
}

// ─── Bootstrapping ────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Hydrate from localStorage and paint the initial list.
  init();
  renderTodos(getSortedTodos());

  // "Add" button click.
  document.getElementById('add-btn').addEventListener('click', handleAdd);

  // Enter key in the input field.
  document
    .getElementById('new-todo-input')
    .addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAdd();
    });

  // Single delegated listener on #todo-list for toggle and delete.
  // Attached once — survives full re-renders without rebinding.
  document.getElementById('todo-list').addEventListener('click', (e) => {
    const target = e.target;

    // ── Delete action ───────────────────────────────────────────────────────
    if (target.dataset.action === 'delete' && target.dataset.id) {
      const sorted = deleteTodo(target.dataset.id);
      renderTodos(sorted);
      return;
    }

    // ── Toggle (checkbox) ───────────────────────────────────────────────────
    if (target.type === 'checkbox' && target.dataset.id) {
      const sorted = toggleTodo(target.dataset.id);
      renderTodos(sorted);
    }
  });
});
