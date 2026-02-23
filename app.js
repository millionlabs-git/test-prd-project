/* ============================================================
   app.js — Todo App
   Architecture: TodoStore → TodoRenderer → TodoApp
   Persistence: localStorage  |  No framework, no build step
   ============================================================ */

// ============================================================
//  TodoStore — State & Persistence
// ============================================================
const TodoStore = {
  _todos: [],

  /**
   * Hydrates in-memory state from localStorage on startup.
   * Silently resets to [] if stored JSON is corrupt.
   */
  _load() {
    try {
      const raw = localStorage.getItem('todos');
      this._todos = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('TodoStore: corrupt localStorage data, resetting.', e);
      this._todos = [];
    }
  },

  /**
   * Serializes current state to localStorage.
   * Silently degrades (in-memory state survives) if storage is unavailable.
   */
  _save() {
    try {
      localStorage.setItem('todos', JSON.stringify(this._todos));
    } catch (e) {
      console.warn('TodoStore: could not persist to localStorage.', e);
    }
  },

  /** Returns a shallow copy of the todos array. */
  getAll() {
    return [...this._todos];
  },

  /**
   * Creates a new todo and prepends it to the list.
   * @param {string} text — Raw user input; trimmed internally.
   * @returns {object|null} The new Todo, or null if text is empty after trim.
   */
  add(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return null;

    const todo = {
      id:        crypto.randomUUID(),
      text:      trimmed,
      completed: false,
      createdAt: Date.now(),
    };

    this._todos.unshift(todo);
    this._save();
    return todo;
  },

  /**
   * Flips the `completed` flag on the todo with the given id.
   * No-op if the id is not found.
   * @param {string} id
   */
  toggle(id) {
    const todo = this._todos.find(t => t.id === id);
    if (!todo) return;
    todo.completed = !todo.completed;
    this._save();
  },

  /**
   * Permanently removes the todo with the given id.
   * No-op if the id is not found.
   * @param {string} id
   */
  remove(id) {
    this._todos = this._todos.filter(t => t.id !== id);
    this._save();
  },
};

// ============================================================
//  TodoRenderer — DOM Rendering
// ============================================================
const TodoRenderer = {
  _listEl: null,

  /** Cache the list container reference (called once on init). */
  _init() {
    this._listEl = document.getElementById('todo-list');
  },

  /**
   * Sorts todos: incomplete first (newest at top), completed last (newest at top).
   * Returns a new array; does not mutate the input.
   * @param {object[]} todos
   * @returns {object[]}
   */
  _sortTodos(todos) {
    return [...todos].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1; // incomplete first
      }
      return b.createdAt - a.createdAt; // newest first within each group
    });
  },

  /**
   * Builds and returns a single <li> DOM node for a todo.
   * @param {object} todo
   * @returns {HTMLElement}
   */
  _createItem(todo) {
    const li = document.createElement('li');
    li.dataset.id = todo.id;
    li.className =
      'todo-item flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl ' +
      'border border-gray-200 hover:border-gray-300 transition';

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.dataset.action = 'toggle';
    checkbox.className = 'w-4 h-4 accent-blue-500 cursor-pointer flex-shrink-0';
    checkbox.setAttribute(
      'aria-label',
      `Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`,
    );

    // Text label
    const span = document.createElement('span');
    span.className =
      'todo-text flex-1 text-gray-700 break-words' +
      (todo.completed ? ' line-through text-gray-400' : '');
    span.textContent = todo.text;

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.dataset.action = 'delete';
    deleteBtn.className =
      'delete-btn flex-shrink-0 text-gray-300 hover:text-red-500 ' +
      'transition text-lg leading-none px-1';
    deleteBtn.textContent = '✕';
    deleteBtn.setAttribute('aria-label', `Delete "${todo.text}"`);

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(deleteBtn);

    return li;
  },

  /**
   * Clears #todo-list and re-renders every todo.
   * Shows an empty-state placeholder when the list is empty.
   * @param {object[]} todos
   */
  render(todos) {
    if (!this._listEl) this._init();
    this._listEl.innerHTML = '';

    if (todos.length === 0) {
      const placeholder = document.createElement('li');
      placeholder.className =
        'todo-placeholder text-center text-gray-400 italic py-10 select-none';
      placeholder.textContent = 'No todos yet — add one above!';
      this._listEl.appendChild(placeholder);
      return;
    }

    const sorted = this._sortTodos(todos);
    sorted.forEach(todo => this._listEl.appendChild(this._createItem(todo)));
  },
};

// ============================================================
//  TodoApp — Event Wiring & Controller
// ============================================================
const TodoApp = {
  /** Bootstrap: load persisted state, render, attach all event listeners. */
  init() {
    TodoRenderer._init();
    TodoStore._load();
    TodoRenderer.render(TodoStore.getAll());

    const input   = document.getElementById('todo-input');
    const addBtn  = document.getElementById('add-btn');
    const listEl  = document.getElementById('todo-list');

    // ── Add via button ──────────────────────────────────────
    addBtn.addEventListener('click', () => this._handleAdd(input));

    // ── Add via Enter key ───────────────────────────────────
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') this._handleAdd(input);
    });

    // ── Toggle complete (event delegation) ─────────────────
    listEl.addEventListener('change', e => {
      if (e.target.dataset.action !== 'toggle') return;
      const item = e.target.closest('[data-id]');
      if (!item) return;
      TodoStore.toggle(item.dataset.id);
      TodoRenderer.render(TodoStore.getAll());
    });

    // ── Delete (event delegation) ───────────────────────────
    listEl.addEventListener('click', e => {
      if (e.target.dataset.action !== 'delete') return;
      const item = e.target.closest('[data-id]');
      if (!item) return;
      TodoStore.remove(item.dataset.id);
      TodoRenderer.render(TodoStore.getAll());
    });
  },

  /**
   * Handles the "add" action from both button and Enter key.
   * Shows error feedback on empty/whitespace-only input.
   * @param {HTMLInputElement} input
   */
  _handleAdd(input) {
    const todo = TodoStore.add(input.value);
    if (!todo) {
      this._showInputError(input);
      return;
    }
    TodoRenderer.render(TodoStore.getAll());
    input.value = '';
    input.focus();
  },

  /**
   * Briefly applies the `input-error` class to trigger the shake animation
   * and red-outline style, then removes it so it can fire again.
   * @param {HTMLInputElement} input
   */
  _showInputError(input) {
    input.classList.remove('input-error'); // reset so re-trigger works
    void input.offsetWidth;               // force reflow
    input.classList.add('input-error');
    setTimeout(() => input.classList.remove('input-error'), 600);
  },
};

// ── Bootstrap ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => TodoApp.init());
