# Todo App - Architecture Document

## Table of Contents

1. [Tech Stack Decisions](#1-tech-stack-decisions)
2. [File Structure](#2-file-structure)
3. [Data Model](#3-data-model)
4. [localStorage Schema](#4-localstorage-schema)
5. [Module and Function Design (app.js)](#5-module-and-function-design-appjs)
6. [UI Component Breakdown](#6-ui-component-breakdown)
7. [Rendering Strategy](#7-rendering-strategy)
8. [Error Handling Strategy](#8-error-handling-strategy)
9. [Sorting and Display Rules](#9-sorting-and-display-rules)

---

## 1. Tech Stack Decisions

| Concern        | Choice                        | Rationale                                                                                                                                                |
|----------------|-------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------|
| Markup         | HTML5                         | Single static page. No build step or server required.                                                                                                   |
| Styling        | Tailwind CSS via CDN          | Utility-first classes eliminate the need for a separate hand-written stylesheet for the majority of styles. No build tooling required when loaded via CDN. |
| Logic          | Vanilla JavaScript (ES6+)     | The feature set is small enough that a framework would add unnecessary complexity and payload.                                                            |
| Persistence    | Browser localStorage          | Zero-backend requirement. Data survives page reloads and is scoped to the origin. Appropriate for a single-user, single-device app.                       |
| Custom CSS     | style.css (minimal)           | Tailwind covers most styling needs. A small supplemental stylesheet handles transitions, strikethrough text, and any utility gaps not covered by CDN Tailwind. |

No build tools (Webpack, Vite, Babel, etc.) are used. The app runs directly in the browser by opening `index.html`.

---

## 2. File Structure

```
todo-app/
  index.html      # Single page shell; loads Tailwind CDN, style.css, app.js
  style.css       # Minimal custom styles (transitions, strikethrough, scrollbar)
  app.js          # All application logic (state, CRUD, render, persistence)
  docs/
    PRD.md
    ARCHITECTURE.md
```

### File responsibilities

**index.html**
- Declares the root HTML skeleton.
- Loads Tailwind CSS from the official CDN `<script>` tag.
- Links `style.css` in `<head>`.
- Contains the static structural elements: page wrapper, app container, input row, and an empty `<ul id="todo-list">` that `app.js` populates.
- Loads `app.js` as a `defer` script at the bottom of `<head>` (or as a module at end of `<body>`).

**style.css**
- `.todo-item-enter` / `.todo-item-leave` transition keyframes for smooth add/remove animations.
- `line-through` helper for completed todo text (Tailwind's `line-through` class can also be used directly; the file exists as a fallback).
- Minor scrollbar styling on the list container if the list grows tall.

**app.js**
- Owns all state, CRUD logic, localStorage I/O, and DOM rendering.
- Organized into clearly separated sections (detailed in section 5).

---

## 3. Data Model

Each todo is a plain JavaScript object with the following shape.

### Todo Object

| Field       | Type      | Description                                                     | Example                        |
|-------------|-----------|-----------------------------------------------------------------|--------------------------------|
| `id`        | `string`  | UUID v4 generated at creation time. Immutable after creation.   | `"a3f1c2d4-..."`               |
| `text`      | `string`  | The todo content entered by the user. Trimmed before storage.   | `"Buy groceries"`              |
| `completed` | `boolean` | Whether the todo has been checked off.                          | `false`                        |
| `createdAt` | `number`  | Unix timestamp (ms) from `Date.now()` at creation time.         | `1709385600000`                |

### TypeScript-style interface (for documentation purposes only)

```ts
interface Todo {
  id: string;          // UUID v4
  text: string;        // trimmed, non-empty
  completed: boolean;
  createdAt: number;   // Date.now()
}
```

### Constraints

- `text` must be a non-empty string after trimming. Validation is enforced before any todo is created.
- `id` is generated using `crypto.randomUUID()` (available in all modern browsers). A fallback using `Math.random()` is included for older environments.
- `createdAt` is set once at creation and never mutated.

---

## 4. localStorage Schema

### Key

```
todos
```

A single key is used for the entire dataset.

### Value

A JSON-serialized array of `Todo` objects.

```json
[
  {
    "id": "a3f1c2d4-e5f6-7890-abcd-ef1234567890",
    "text": "Buy groceries",
    "completed": false,
    "createdAt": 1709385600000
  },
  {
    "id": "b4e2d1c3-f6a7-8901-bcde-f01234567891",
    "text": "Read a book",
    "completed": true,
    "createdAt": 1709299200000
  }
]
```

### Read / Write contract

- **Read on boot**: `JSON.parse(localStorage.getItem('todos') ?? '[]')` inside a try/catch. Falls back to an empty array if the value is absent or malformed.
- **Write after every mutation**: `localStorage.setItem('todos', JSON.stringify(state.todos))`. All CRUD operations call `persist()` immediately after updating in-memory state.

### Storage limits

localStorage is capped at approximately 5 MB per origin by most browsers. Given the data model, this limit is not a practical concern for a personal todo list.

---

## 5. Module and Function Design (app.js)

`app.js` is a single self-contained IIFE (Immediately Invoked Function Expression) or ES module. It is divided into the following logical sections, in order.

### 5.1 State

```js
// The single source of truth.
const state = {
  todos: []   // Todo[]
};
```

All reads and writes go through the functions below. The DOM is never read back to determine state.

### 5.2 Persistence Layer

| Function         | Signature                     | Description                                                                 |
|------------------|-------------------------------|-----------------------------------------------------------------------------|
| `loadTodos()`    | `() => Todo[]`                | Reads and parses the `todos` key from localStorage. Returns `[]` on error.  |
| `persist()`      | `() => void`                  | Serializes `state.todos` and writes it to localStorage.                     |

```js
function loadTodos() {
  try {
    return JSON.parse(localStorage.getItem('todos') ?? '[]');
  } catch {
    return [];
  }
}

function persist() {
  localStorage.setItem('todos', JSON.stringify(state.todos));
}
```

### 5.3 ID Generation

| Function        | Signature      | Description                                                               |
|-----------------|----------------|---------------------------------------------------------------------------|
| `generateId()`  | `() => string` | Returns `crypto.randomUUID()`. Falls back to a `Math.random()` hex string.|

```js
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
```

### 5.4 CRUD Operations

All operations mutate `state.todos` in place, then call `persist()`, then call `render()`.

| Function                  | Signature                         | Description                                                                          |
|---------------------------|-----------------------------------|--------------------------------------------------------------------------------------|
| `addTodo(text)`           | `(text: string) => void`          | Validates trimmed text is non-empty. Prepends a new Todo to `state.todos`.           |
| `toggleTodo(id)`          | `(id: string) => void`            | Finds the todo by `id` and flips its `completed` flag.                               |
| `deleteTodo(id)`          | `(id: string) => void`            | Removes the todo with the given `id` from `state.todos`.                             |

```js
function addTodo(text) {
  const trimmed = text.trim();
  if (!trimmed) return;                      // guard: reject empty input
  state.todos.unshift({
    id: generateId(),
    text: trimmed,
    completed: false,
    createdAt: Date.now()
  });
  persist();
  render();
}

function toggleTodo(id) {
  const todo = state.todos.find(t => t.id === id);
  if (!todo) return;
  todo.completed = !todo.completed;
  persist();
  render();
}

function deleteTodo(id) {
  state.todos = state.todos.filter(t => t.id !== id);
  persist();
  render();
}
```

### 5.5 Sorting

Sorting is computed fresh on every render call and never mutates `state.todos`.

```
Sort order:
  1. Incomplete todos first (completed === false), sorted by createdAt descending (newest first).
  2. Completed todos last (completed === true), sorted by createdAt descending (newest first).
```

```js
function getSortedTodos() {
  return [...state.todos].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;    // incomplete first
    }
    return b.createdAt - a.createdAt; // newest first within each group
  });
}
```

### 5.6 Render

`render()` is the single function responsible for updating the DOM. It performs a full list redraw by clearing and rebuilding the `<ul>` contents. This is safe at the scale of a personal todo list (typically fewer than a few hundred items).

| Function     | Signature      | Description                                                                                |
|--------------|----------------|--------------------------------------------------------------------------------------------|
| `render()`   | `() => void`   | Clears `#todo-list`, calls `getSortedTodos()`, builds and appends one `<li>` per todo.     |

```js
function render() {
  const list = document.getElementById('todo-list');
  list.innerHTML = '';

  const sorted = getSortedTodos();

  if (sorted.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'text-center text-gray-400 py-8';
    empty.textContent = 'No todos yet. Add one above!';
    list.appendChild(empty);
    return;
  }

  sorted.forEach(todo => {
    list.appendChild(createTodoElement(todo));
  });
}
```

### 5.7 DOM Element Factory

| Function                   | Signature               | Description                                           |
|----------------------------|-------------------------|-------------------------------------------------------|
| `createTodoElement(todo)`  | `(todo: Todo) => HTMLElement` | Builds and returns a single `<li>` for the given todo.|

The `<li>` element contains:
- A `<input type="checkbox">` bound to `toggleTodo(todo.id)`.
- A `<span>` for the todo text. Gets a `line-through` class when `todo.completed` is true.
- A `<button>` (the X delete button) bound to `deleteTodo(todo.id)`.

```js
function createTodoElement(todo) {
  const li = document.createElement('li');
  li.dataset.id = todo.id;
  // Tailwind classes applied here for layout, border, hover states, transitions.

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.completed;
  checkbox.addEventListener('change', () => toggleTodo(todo.id));

  const span = document.createElement('span');
  span.textContent = todo.text;
  if (todo.completed) {
    span.classList.add('line-through', 'text-gray-400');
  }

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = 'x';
  deleteBtn.setAttribute('aria-label', 'Delete todo');
  deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

  li.append(checkbox, span, deleteBtn);
  return li;
}
```

### 5.8 Input Handling

| Function          | Signature      | Description                                                                        |
|-------------------|----------------|------------------------------------------------------------------------------------|
| `bindInput()`     | `() => void`   | Attaches event listeners to the input field and Add button. Called once on boot.   |

```js
function bindInput() {
  const input  = document.getElementById('todo-input');
  const button = document.getElementById('add-btn');

  button.addEventListener('click', () => {
    addTodo(input.value);
    input.value = '';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addTodo(input.value);
      input.value = '';
    }
  });
}
```

### 5.9 Boot / Initialization

```js
function init() {
  state.todos = loadTodos();
  bindInput();
  render();
}

document.addEventListener('DOMContentLoaded', init);
```

### Summary: call flow for each user action

```
User types + presses Enter / clicks Add
  -> bindInput handler
  -> addTodo(text)
      -> validate (early return if empty)
      -> state.todos.unshift(newTodo)
      -> persist()
      -> render()
          -> getSortedTodos()
          -> rebuild <ul> in DOM

User clicks checkbox
  -> toggleTodo(id)
      -> flip todo.completed
      -> persist()
      -> render()

User clicks delete X
  -> deleteTodo(id)
      -> filter out todo from state.todos
      -> persist()
      -> render()

Page load
  -> DOMContentLoaded
  -> init()
      -> loadTodos() -> state.todos
      -> bindInput()
      -> render()
```

---

## 6. UI Component Breakdown

The UI is a single HTML page with three logical regions.

```
+------------------------------------------+
|              Page background             |
|  +--------------------------------------+|
|  |          App Container               ||
|  |  Title: "My Todos"                   ||
|  |  +--------------------------------+  ||
|  |  |  Input Row                     |  ||
|  |  |  [ text input      ] [ Add ]   |  ||
|  |  +--------------------------------+  ||
|  |  +--------------------------------+  ||
|  |  |  Todo List  <ul>               |  ||
|  |  |  +----------------------------+|  ||
|  |  |  | Todo Item  <li>            ||  ||
|  |  |  | [x] todo text          [x] ||  ||
|  |  |  +----------------------------+|  ||
|  |  |  | Todo Item  <li>            ||  ||
|  |  |  | [x] todo text (done) s/t[x]||  ||
|  |  |  +----------------------------+|  ||
|  |  +--------------------------------+  ||
|  +--------------------------------------+|
+------------------------------------------+
```

### Component table

| Component          | HTML element         | Tailwind / style notes                                                                 |
|--------------------|----------------------|----------------------------------------------------------------------------------------|
| Page wrapper       | `<body>`             | `min-h-screen bg-gray-100 flex items-center justify-center`                            |
| App container      | `<div id="app">`     | `w-full max-width 600px bg-white rounded-2xl shadow-lg p-6`                            |
| App title          | `<h1>`               | `text-2xl font-bold text-gray-800 mb-4`                                                |
| Input row          | `<div>`              | `flex gap-2 mb-4`                                                                      |
| Text input         | `<input id="todo-input">` | `flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2`              |
| Add button         | `<button id="add-btn">` | `bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 transition`         |
| Todo list          | `<ul id="todo-list">` | `divide-y divide-gray-100`                                                            |
| Todo item          | `<li data-id="...">`  | `flex items-center gap-3 py-3 transition-opacity duration-200`                        |
| Checkbox           | `<input type="checkbox">` | `w-4 h-4 accent-blue-500 cursor-pointer`                                          |
| Todo text          | `<span>`              | `flex-1 text-gray-700`; adds `line-through text-gray-400` when completed              |
| Delete button      | `<button>`            | `text-gray-300 hover:text-red-500 transition font-bold text-lg leading-none`          |
| Empty state        | `<li>` (no data-id)   | `text-center text-gray-400 py-8` — rendered by `render()` when list is empty          |

### Accessibility notes

- The checkbox has an implicit label via its sibling `<span>` positioned immediately after it. If stricter accessibility is required, a `<label>` wrapping both elements is preferred.
- The delete button carries an `aria-label="Delete todo"` attribute because its visible text (`x`) is not descriptive on its own.
- The text input carries a `placeholder` attribute ("What needs to be done?") and an `aria-label="New todo text"`.

---

## 7. Rendering Strategy

A full redraw (`innerHTML = ''` then rebuild) is chosen over incremental DOM patching for the following reasons.

- The expected list size for a personal todo app is small (under a few hundred items). Full redraw is imperceptible at this scale.
- It eliminates an entire class of bugs related to stale DOM state being out of sync with JavaScript state.
- It keeps the render function simple, linear, and easy to test visually.

If the list were expected to grow into the thousands of items, a keyed diffing approach or a virtual list (windowing) would be warranted. That complexity is not justified here.

Transitions for add/remove are achieved via CSS `transition-opacity` and `transition-transform` classes on `<li>` elements. Because `innerHTML = ''` replaces the whole list, entrance animations are triggered by toggling a class on the new elements one frame after insertion (using `requestAnimationFrame`).

---

## 8. Error Handling Strategy

| Scenario                                    | Handling                                                                                                       |
|---------------------------------------------|----------------------------------------------------------------------------------------------------------------|
| Empty input submitted                       | `addTodo` returns early without mutating state or calling `render`. No error message shown (silent guard).     |
| Whitespace-only input submitted             | Same as empty input: `.trim()` is applied before the empty check.                                             |
| localStorage unavailable (private browsing) | `loadTodos` wraps the read in a try/catch and returns `[]`. `persist` wraps the write in a try/catch and logs a console warning. The app continues to function in-memory for the session. |
| localStorage value is malformed JSON        | `JSON.parse` inside `loadTodos` try/catch returns `[]` as the fallback. The malformed value is overwritten on the next `persist()` call. |
| `deleteTodo` / `toggleTodo` called with unknown id | Guard clauses (`find` returning `undefined`) cause the function to return early with no side effects. |

No modal dialogs or toast notifications are shown for errors in this version. The app favors silent resilience over verbose error reporting, consistent with the PRD's emphasis on simplicity.

---

## 9. Sorting and Display Rules

The display order is determined entirely by `getSortedTodos()` and re-evaluated on every render.

| Priority | Condition                        | Secondary sort            |
|----------|----------------------------------|---------------------------|
| 1 (top)  | `completed === false`            | `createdAt` descending    |
| 2 (bottom)| `completed === true`           | `createdAt` descending    |

This means:
- Newly added todos appear at the top of the incomplete section.
- Completing a todo immediately moves it to the bottom section.
- Un-completing a todo moves it back to the incomplete section at the position its `createdAt` value dictates (not necessarily the very top, since other newer incomplete todos may exist).
