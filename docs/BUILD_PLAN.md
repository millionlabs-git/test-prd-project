# Build Plan — Todo App

**Generated from:** `docs/ARCHITECTURE.md`
**Date:** 2026-02-23
**Status:** Ready for implementation

---

## Overview

Nine sequential tasks that build the app layer-by-layer — scaffold → persistence → business logic → rendering → wiring → error handling. Each task is independently testable before the next begins.

**Dependency graph at a glance:**

```
Task 1 (HTML Scaffold)
  ├── Task 2 (Custom CSS)
  ├── Task 3 (StorageService)
  │     └── Task 4 (TodoManager)
  │           └── Task 6 (app.js – Core Wiring)
  │                 ├── Task 7 (Event Delegation)
  │                 ├── Task 8 (Validation Feedback)
  │                 └── Task 9 (Storage Error UI)
  └── Task 5 (UIRenderer)
        └── Task 6 (app.js – Core Wiring)
```

---

## Task 1: HTML Scaffold

- **Description:** Create the single `index.html` entry point with a fully semantic page skeleton. Include the Tailwind CSS CDN `<link>`, the custom CSS `<link>`, and the `<script type="module" src="js/app.js">` tag. Lay out the visible UI shell: a centered container (max-width 600px), an `<h1>` heading, a row with `#new-todo-input` and `#add-btn`, and an empty `<ul id="todo-list">`. No JavaScript logic yet — the page should render its static shell correctly.
- **Files:**
  - `index.html` *(create)*
  - `css/` *(create directory)*
  - `js/` *(create directory)*
- **Dependencies:** None
- **Has UI:** true
- **Route:** `/index.html`
- **Acceptance Criteria:**
  - Opening `index.html` in a browser renders a centered card with a heading, an input field, and an "Add" button — no console errors.
  - The Tailwind CDN stylesheet is applied (utility classes on elements take effect).
  - `<ul id="todo-list">` exists in the DOM and is empty.
  - The page is valid HTML5 (no unclosed tags, correct `<head>`/`<body>` structure).
  - A `<script type="module" src="js/app.js">` tag is present (even though the file does not exist yet — the browser will silently fail, which is acceptable at this stage).

---

## Task 2: Custom CSS

- **Description:** Create `css/styles.css` with all styles that cannot be expressed with Tailwind utility classes alone: smooth transitions for todo items appearing/disappearing, a CSS transition for the strikethrough on completed todos, an input focus-ring highlight used for validation error feedback (a red ring class such as `.input-error`), and any global resets or font settings that improve the baseline look. Import this file from `index.html` (already referenced in Task 1).
- **Files:**
  - `css/styles.css` *(create)*
- **Dependencies:** Task 1
- **Has UI:** true
- **Route:** `/index.html`
- **Acceptance Criteria:**
  - `css/styles.css` is loaded by `index.html` without 404 errors.
  - A `.input-error` class exists in the stylesheet that applies a visible red focus ring (e.g., `outline: 2px solid red`).
  - A `.todo-item` entry animation class is defined (e.g., a fade-in or slide-down `@keyframes` transition).
  - A `.completed-text` class applies a `text-decoration: line-through` with a CSS `transition` so strikethrough animates smoothly.
  - Applying `.input-error` manually via DevTools to `#new-todo-input` produces a visible red ring.

---

## Task 3: StorageService

- **Description:** Create `js/storage.js` exporting two named functions: `load()` and `save(todos)`. `load()` reads the `"todos"` key from `localStorage`, parses the JSON, and returns the resulting array; it must return `[]` (not throw) if the key is absent or the value is corrupt JSON. `save(todos)` serializes the array to JSON and writes it to `localStorage`; it must propagate (re-throw) `QuotaExceededError` so the caller can handle it. Include a console warning in the `load()` catch path for corrupt data.
- **Files:**
  - `js/storage.js` *(create)*
- **Dependencies:** None
- **Has UI:** false
- **Acceptance Criteria:**
  - `load()` returns `[]` when `localStorage` has no `"todos"` key.
  - `load()` returns `[]` and logs a `console.warn` when `localStorage["todos"]` contains invalid JSON (e.g., `"not-json"`).
  - `load()` returns the correct `Todo[]` when `localStorage["todos"]` contains valid JSON.
  - `save(todos)` writes a JSON string to `localStorage["todos"]` that round-trips correctly through `load()`.
  - Both functions can be imported and called in the browser console without errors: `import { load, save } from './js/storage.js'`.

---

## Task 4: TodoManager

- **Description:** Create `js/todoManager.js` implementing all business logic. Export five functions: `init()`, `addTodo(text)`, `deleteTodo(id)`, `toggleTodo(id)`, and `getSortedTodos()`. Maintain a module-level `todos` array as the single source of truth. All mutating operations must call `StorageService.save()` after updating the array. `addTodo()` must throw a `ValidationError` (a named custom error class defined in this file) when `text.trim()` is empty. IDs are generated with `crypto.randomUUID()` with a fallback of `Date.now().toString(36) + Math.random().toString(36).slice(2)` for environments that lack the API. `getSortedTodos()` returns a sorted copy: incomplete todos (descending `createdAt`) first, then completed todos (descending `createdAt`).
- **Files:**
  - `js/todoManager.js` *(create)*
- **Dependencies:** Task 3
- **Has UI:** false
- **Acceptance Criteria:**
  - `init()` loads from `StorageService.load()` and populates the internal array; calling `getSortedTodos()` immediately after returns the persisted todos.
  - `addTodo("Buy milk")` returns a `Todo[]` containing the new item with a non-empty `id`, `text === "Buy milk"`, `completed === false`, and a numeric `createdAt`.
  - `addTodo("  ")` throws an error that is an instance of `ValidationError`.
  - `deleteTodo(id)` removes the matching todo and returns the updated sorted list; calling with an unknown id is a silent no-op.
  - `toggleTodo(id)` flips `completed` and returns the updated sorted list; calling with an unknown id is a silent no-op.
  - `getSortedTodos()` returns incomplete todos before completed todos; within each group, higher `createdAt` values appear first.
  - Every mutating call (`addTodo`, `deleteTodo`, `toggleTodo`) results in `localStorage["todos"]` being updated (verifiable by reading `localStorage` directly in the browser console).

---

## Task 5: UIRenderer

- **Description:** Create `js/uiRenderer.js` exporting three functions: `renderTodos(todos)`, `buildTodoElement(todo)`, and `clearInput()`. `renderTodos` clears `#todo-list` and rebuilds it by calling `buildTodoElement` for each todo and appending the resulting `<li>` elements. `buildTodoElement` produces a `<li>` containing: a `<input type="checkbox">` with `data-id="{todo.id}"` and `checked` state matching `todo.completed`; a `<span>` with the todo text that has the `.completed-text` class (from Task 2) when `todo.completed` is `true`; and a `<button>` with `data-id="{todo.id}"` and `data-action="delete"`. Apply Tailwind utility classes throughout for layout and visual style. `clearInput` sets `#new-todo-input` value to `""`.
- **Files:**
  - `js/uiRenderer.js` *(create)*
- **Dependencies:** Task 1, Task 2
- **Has UI:** false
- **Acceptance Criteria:**
  - Calling `renderTodos([])` in the browser console (after importing the module) clears `#todo-list` and leaves it empty.
  - Calling `renderTodos([{ id: "1", text: "Test", completed: false, createdAt: 0 }])` produces one `<li>` in `#todo-list` containing a checkbox, a span with text "Test", and a delete button.
  - A completed todo's `<span>` has the `.completed-text` class; an incomplete todo's `<span>` does not.
  - Every checkbox has a `data-id` attribute matching its todo's `id`.
  - Every delete button has both `data-id` and `data-action="delete"` attributes.
  - `clearInput()` sets `#new-todo-input.value` to `""`.

---

## Task 6: app.js — Core Wiring (Init + Add)

- **Description:** Create `js/app.js` as the application entry point. On `DOMContentLoaded`, call `TodoManager.init()` then `UIRenderer.renderTodos(TodoManager.getSortedTodos())` to hydrate the initial list. Attach a click listener to `#add-btn` and a `keydown` listener to `#new-todo-input` (fire on `Enter`) — both read the input value, call `TodoManager.addTodo(text)`, pass the returned sorted list to `UIRenderer.renderTodos()`, and then call `UIRenderer.clearInput()`. At this stage, catch `ValidationError` but only `console.warn` it (full UI feedback is Task 8). Catch any storage errors from `addTodo` and `console.error` them (full UI feedback is Task 9).
- **Files:**
  - `js/app.js` *(create)*
- **Dependencies:** Task 4, Task 5
- **Has UI:** true
- **Route:** `/index.html`
- **Acceptance Criteria:**
  - On page load, todos previously saved to `localStorage` are rendered in the list without any user interaction.
  - Typing text into `#new-todo-input` and clicking "Add" appends the todo to the list and clears the input field.
  - Typing text into `#new-todo-input` and pressing `Enter` appends the todo to the list and clears the input field.
  - Submitting whitespace-only text does not add a todo; a `console.warn` appears in DevTools.
  - Reloading the page after adding todos shows the same todos (persistence confirmed).
  - Newly added todos appear at the top of the list.

---

## Task 7: Event Delegation — Toggle & Delete

- **Description:** Extend `js/app.js` with a single delegated event listener attached to `#todo-list`. On `click` events, inspect `event.target`: if it is a `<input type="checkbox">` with a `data-id`, call `TodoManager.toggleTodo(id)` and re-render; if it is an element with `data-action="delete"` and a `data-id`, call `TodoManager.deleteTodo(id)` and re-render. Use `event.target.closest('[data-id]')` to handle clicks on child elements within the button. This listener must be attached once and must continue to work correctly after full re-renders.
- **Files:**
  - `js/app.js` *(modify)*
- **Dependencies:** Task 6
- **Has UI:** true
- **Route:** `/index.html`
- **Acceptance Criteria:**
  - Clicking a checkbox marks the todo as complete: the checkbox becomes checked, the text gains strikethrough styling, and the todo moves to the bottom of the list.
  - Clicking a checked checkbox un-completes the todo: strikethrough is removed and the todo moves back to the top group.
  - Clicking a delete button removes the todo from the list permanently.
  - After deleting a todo, reloading the page confirms it is gone from `localStorage`.
  - Adding several todos and toggling/deleting them in sequence leaves the list in a consistent, correct order.
  - The delegated listener is attached exactly once (verify by checking `getEventListeners(document.querySelector('#todo-list'))` in DevTools — one `click` listener).

---

## Task 8: Validation Error UI Feedback

- **Description:** In `js/app.js`, upgrade the `ValidationError` catch block (from Task 6) to provide visible user feedback. When `TodoManager.addTodo()` throws a `ValidationError`, add the `.input-error` CSS class (from Task 2) to `#new-todo-input` and remove it after 600 ms using `setTimeout`. Do not clear the input or add any todo. The input field should briefly flash a red ring and then return to its normal state.
- **Files:**
  - `js/app.js` *(modify)*
- **Dependencies:** Task 6, Task 2
- **Has UI:** true
- **Route:** `/index.html`
- **Acceptance Criteria:**
  - Clicking "Add" with an empty input causes `#new-todo-input` to display a red ring for approximately 600 ms, then the ring disappears.
  - Pressing `Enter` with an empty input produces the same red-ring feedback.
  - No todo is added to the list when the validation error fires.
  - The input field is not cleared during the error state.
  - After the ring disappears, the user can type normally and submit a valid todo without any leftover error state.

---

## Task 9: Storage Error UI Feedback

- **Description:** In `js/app.js`, upgrade the storage error catch block (from Task 6) to surface a user-visible, non-blocking inline message when `localStorage` is full. When a `QuotaExceededError` (or any storage error propagated from `TodoManager`) is caught, insert a `<p id="storage-error">Could not save — storage is full.</p>` element into the page (e.g., below `#add-btn` row). Remove the message after 4 seconds. The in-memory state (the rendered list) must remain valid — the error only means the change was not persisted.
- **Files:**
  - `js/app.js` *(modify)*
  - `index.html` *(modify — add a `#storage-error-container` placeholder if needed)*
- **Dependencies:** Task 6, Task 3
- **Has UI:** true
- **Route:** `/index.html`
- **Acceptance Criteria:**
  - Simulating a full `localStorage` (e.g., by stubbing `localStorage.setItem` to throw `DOMException` in DevTools) causes the inline "Could not save — storage is full." message to appear.
  - The error message disappears automatically after approximately 4 seconds.
  - The todo list remains rendered and interactive after the error (the in-memory state is unaffected).
  - The error message does not appear for normal, successful saves.
  - Only one error message is shown at a time (a second storage error while the first message is visible replaces or extends it, rather than stacking duplicates).
