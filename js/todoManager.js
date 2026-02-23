/**
 * @fileoverview TodoManager — business logic and single source of truth.
 *
 * Holds the in-memory `todos` array. All mutations go through here, and every
 * mutation is followed by a persistence call to StorageService.
 *
 * @typedef {Object} Todo
 * @property {string}  id        - Unique identifier (UUID or timestamp-based fallback)
 * @property {string}  text      - Display text (trimmed, non-empty)
 * @property {boolean} completed - Whether the todo is marked done
 * @property {number}  createdAt - Unix timestamp in ms at creation time
 */

import { load, save } from './storage.js';

// ─── Custom error types ───────────────────────────────────────────────────────

/** Thrown when the user submits empty or whitespace-only todo text. */
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ─── Internal state ───────────────────────────────────────────────────────────

/** @type {Todo[]} Authoritative in-memory todo list. */
let todos = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a unique ID.
 * Uses `crypto.randomUUID()` when available, falls back to a timestamp +
 * random string for very old browsers.
 *
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise internal state by loading persisted todos from StorageService.
 * Must be called once at application startup before any other function.
 */
export function init() {
  todos = load();
}

/**
 * Create a new todo, prepend it to the list, persist, and return the sorted list.
 *
 * @param {string} text - Raw input text (will be trimmed)
 * @returns {Todo[]} The updated, sorted todo list
 * @throws {ValidationError} If `text` is empty after trimming
 */
export function addTodo(text) {
  const trimmed = String(text).trim();
  if (!trimmed) {
    throw new ValidationError('Todo text cannot be empty.');
  }

  /** @type {Todo} */
  const newTodo = {
    id: generateId(),
    text: trimmed,
    completed: false,
    createdAt: Date.now(),
  };

  todos = [newTodo, ...todos];
  save(todos); // may throw QuotaExceededError — propagated to caller
  return getSortedTodos();
}

/**
 * Remove the todo with the given id, persist, and return the sorted list.
 * Silent no-op if `id` is not found.
 *
 * @param {string} id
 * @returns {Todo[]}
 */
export function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  save(todos);
  return getSortedTodos();
}

/**
 * Flip the `completed` flag on the todo with the given id, persist, and return
 * the sorted list. Silent no-op if `id` is not found.
 *
 * @param {string} id
 * @returns {Todo[]}
 */
export function toggleTodo(id) {
  todos = todos.map((t) =>
    t.id === id ? { ...t, completed: !t.completed } : t
  );
  save(todos);
  return getSortedTodos();
}

/**
 * Return a sorted copy of the current todos — does NOT mutate internal state.
 *
 * Sort order:
 *   1. Incomplete todos, newest first (descending createdAt)
 *   2. Completed todos, newest first (descending createdAt)
 *
 * @returns {Todo[]}
 */
export function getSortedTodos() {
  const byCreatedAtDesc = (a, b) => b.createdAt - a.createdAt;
  const incomplete = todos.filter((t) => !t.completed).sort(byCreatedAtDesc);
  const complete = todos.filter((t) => t.completed).sort(byCreatedAtDesc);
  return [...incomplete, ...complete];
}
