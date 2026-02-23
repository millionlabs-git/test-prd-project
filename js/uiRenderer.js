/**
 * @fileoverview UIRenderer — pure view layer.
 *
 * Accepts a Todo[] snapshot and produces DOM. Has no knowledge of storage or
 * business rules. All DOM updates are full re-renders of #todo-list.
 *
 * @typedef {import('./todoManager.js').Todo} Todo
 */

/**
 * Fully re-render the #todo-list element with the provided todos.
 * Clears the container and rebuilds all child elements from scratch.
 *
 * @param {Todo[]} todos
 */
export function renderTodos(todos) {
  const list = document.getElementById('todo-list');
  if (!list) return;

  list.innerHTML = '';
  for (const todo of todos) {
    list.appendChild(buildTodoElement(todo));
  }
}

/**
 * Build and return a single <li> element for a todo.
 *
 * Structure:
 *   <li>
 *     <input type="checkbox" data-id="{id}" />
 *     <span class="[completed-text?]">{text}</span>
 *     <button data-id="{id}" data-action="delete">✕</button>
 *   </li>
 *
 * data-* attributes are used by the delegated listener in app.js.
 *
 * @param {Todo} todo
 * @returns {HTMLLIElement}
 */
export function buildTodoElement(todo) {
  const li = document.createElement('li');
  li.className =
    'todo-item flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3';

  // ── Checkbox ──────────────────────────────────────────────────────────────
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.completed;
  checkbox.dataset.id = todo.id;
  checkbox.className = 'w-4 h-4 accent-blue-500 cursor-pointer flex-shrink-0';
  checkbox.setAttribute('aria-label', `Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`);

  // ── Text span ─────────────────────────────────────────────────────────────
  const span = document.createElement('span');
  span.textContent = todo.text;
  span.className =
    'flex-1 text-sm text-gray-800' + (todo.completed ? ' completed-text' : '');

  // ── Delete button ─────────────────────────────────────────────────────────
  const deleteBtn = document.createElement('button');
  deleteBtn.dataset.id = todo.id;
  deleteBtn.dataset.action = 'delete';
  deleteBtn.textContent = '✕';
  deleteBtn.className =
    'text-gray-400 hover:text-red-500 text-sm font-bold transition-colors flex-shrink-0';
  deleteBtn.setAttribute('aria-label', `Delete "${todo.text}"`);

  li.appendChild(checkbox);
  li.appendChild(span);
  li.appendChild(deleteBtn);

  return li;
}

/**
 * Clear the value of the #new-todo-input field.
 */
export function clearInput() {
  const input = document.getElementById('new-todo-input');
  if (input) input.value = '';
}
