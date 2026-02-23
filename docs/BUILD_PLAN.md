# Build Plan — Todo App

> **Generated from:** [ARCHITECTURE.md](./ARCHITECTURE.md) & [PRD.md](./PRD.md)
> **Date:** 2026-02-23

---

## Overview

Six tasks, ordered by dependency. Tasks 2–4 can be built and tested in isolation before wiring together in Task 5. Task 6 (CSS polish) can be layered on at any point after Task 1 exists.

```
Task 1 (scaffold)
    ├── Task 2 (todo.js)
    │       └── Task 3 (store.js)
    │               └─────────────┐
    ├── Task 4 (renderer.js) ─────┤
    │                             ▼
    └─────────────────── Task 5 (app.js) ──► Task 6 (styles.css)
```

---

## Task 1: Project Scaffold & HTML Shell

- **Description:** Create the directory structure and the static HTML entry point. The page should visually render the app chrome — centered card, heading, input form, and empty list container — using Tailwind CDN classes. No JavaScript behaviour yet; this task establishes the DOM structure that all other modules depend on.
- **Files:**
  - `index.html` *(create)*
  - `css/styles.css` *(create — empty file, linked from HTML)*
  - `js/` *(create directory — empty)*
- **Dependencies:** None
- **Has UI:** true
- **Route:** `/` (`index.html`)
- **Acceptance Criteria:**
  - Opening `index.html` over a local static server renders a centred card (max-width 600 px) with a visible heading, a text input, an "Add" button, and an empty `<ul>` list container.
  - Tailwind CSS loads from CDN with no console errors.
  - `css/styles.css` is linked in `<head>` (no 404 in Network tab).
  - All key DOM elements carry the IDs / classes the architecture specifies (`#todo-input`, `#todo-form`, `#todo-list`) so later modules can query them without breaking.
  - The page is responsive and readable at 320 px wide.

---

## Task 2: Todo Factory (`js/todo.js`)

- **Description:** Implement the pure `createTodo(text)` factory function. It must generate a unique `id`, stamp `createdAt`, set `completed: false`, and return a well-shaped `Todo` object. No DOM access, no imports, no side effects.
- **Files:**
  - `js/todo.js` *(create)*
- **Dependencies:** None
- **Has UI:** false
- **Acceptance Criteria:**
  - `createTodo("Buy milk")` returns `{ id, text: "Buy milk", completed: false, createdAt }` where `id` is a non-empty string and `createdAt` is a positive integer (ms timestamp).
  - Two successive calls return objects with distinct `id` values.
  - `id` is a valid UUID when `crypto.randomUUID` is available; falls back gracefully in environments where it is not.
  - The function is exported as a named export (`export function createTodo`).
  - Calling `createTodo("")` does not throw (validation is the caller's responsibility per the architecture).

---

## Task 3: State Manager (`js/store.js`)

- **Description:** Implement the Store module: an in-memory `todos` array backed by `localStorage`. Expose `load()`, `getAll()`, `add(text)`, `toggle(id)`, and `remove(id)`. Enforce the sort order (incomplete newest-first, completed newest-last). Wrap all `localStorage` access in `try/catch` per the error-handling strategy.
- **Files:**
  - `js/store.js` *(create)*
- **Dependencies:** Task 2 (`todo.js` — `createTodo` is called inside `add`)
- **Has UI:** false
- **Acceptance Criteria:**
  - `load()` on a fresh storage key initialises internal state to `[]`.
  - `load()` correctly deserialises a previously saved JSON array from `localStorage`.
  - `load()` resets to `[]` if the stored value is corrupted (invalid JSON or non-array).
  - `add("Walk dog")` returns a `Todo` object and subsequent `getAll()` includes it.
  - `getAll()` returns a **copy** — mutating the returned array does not affect Store state.
  - `getAll()` returns incomplete todos (sorted newest-first) followed by completed todos (sorted newest-first).
  - `toggle(id)` flips `completed` and the item moves to/from the completed section on the next `getAll()`.
  - `remove(id)` eliminates the item; `remove("nonexistent-id")` is a silent no-op.
  - Every write operation (`add`, `toggle`, `remove`) persists to `localStorage` automatically.
  - `localStorage` write failures (e.g. quota exceeded) emit a `console.warn` and do **not** throw.
  - All five functions are named exports.

---

## Task 4: DOM Renderer (`js/renderer.js`)

- **Description:** Implement `renderList(listEl, todos)` and `clearInput(inputEl)`. `renderList` must fully replace the contents of the `<ul>` by building each `<li>` with `document.createElement` (no `innerHTML` for list item content). Each `<li>` renders: a checkbox, the todo text, and a delete button. Apply Tailwind classes for layout and apply the `completed` visual state (text muted + strikethrough class). This module must not import `store.js`.
- **Files:**
  - `js/renderer.js` *(create)*
- **Dependencies:** Task 1 (HTML structure defines the `listEl` contract); Task 2 (Todo object shape)
- **Has UI:** false
- **Acceptance Criteria:**
  - `renderList(listEl, [])` clears the container and renders nothing (empty `<ul>`).
  - `renderList(listEl, todos)` produces exactly one `<li>` per todo.
  - Each `<li>` contains: a `<input type="checkbox">` with `data-id` attribute, a `<span>` with the todo text, and a `<button>` with `data-id` attribute for deletion.
  - A todo with `completed: true` has its text `<span>` styled with a strikethrough/muted class, and its checkbox is `checked`.
  - A todo with `completed: false` has no strikethrough and an unchecked checkbox.
  - Calling `renderList` twice in a row does not double-render items (previous children are cleared).
  - `clearInput(inputEl)` sets `inputEl.value` to `""`.
  - `renderer.js` contains zero `import` statements referencing `store.js`.
  - No `innerHTML` is used to insert user-supplied text (XSS prevention).

---

## Task 5: App Bootstrap & Event Wiring (`js/app.js`)

- **Description:** Implement the application entry point. On `DOMContentLoaded`: query element references, call `store.load()`, then `renderer.renderList(...)`. Wire three event listeners: (1) `#todo-form` submit — add a todo; (2) `keydown Enter` on `#todo-input` (if form submit doesn't already cover it) — add a todo; (3) delegated `click` on `#todo-list` — toggle on checkbox click, remove on delete-button click. Each handler follows the pattern: mutate Store → re-render with `store.getAll()`. Load `app.js` in `index.html` as `<script type="module">`.
- **Files:**
  - `js/app.js` *(create)*
  - `index.html` *(modify — add `<script type="module" src="js/app.js">` before `</body>`)*
- **Dependencies:** Task 1 (HTML shell), Task 3 (`store.js`), Task 4 (`renderer.js`)
- **Has UI:** true
- **Route:** `/` (`index.html`)
- **Acceptance Criteria:**
  - Typing text and clicking "Add" appends a new todo to the top of the list and clears the input.
  - Pressing **Enter** while the input is focused also adds the todo.
  - Submitting an empty or whitespace-only input does nothing (no todo added, no error).
  - Clicking a checkbox marks the todo complete, applies strikethrough styling, and moves it to the bottom section; clicking again reverses this.
  - Clicking a delete button removes the todo from the list immediately.
  - Reloading the page restores all todos in the correct order (localStorage persistence).
  - The list is sorted: incomplete (newest-first) above completed (newest-first) at all times.
  - No uncaught JavaScript errors appear in the browser console during normal use.
  - The page works served from a local static server (`python -m http.server` or equivalent).

---

## Task 6: CSS Transitions & Visual Polish (`css/styles.css`)

- **Description:** Add the custom CSS rules that Tailwind alone cannot provide: entry animation for new list items, strikethrough transition on completion, and any scrollbar or focus-ring polish. All rules must be non-breaking additions — the app must remain fully functional if this file is emptied.
- **Files:**
  - `css/styles.css` *(modify — add animation and transition rules)*
- **Dependencies:** Task 5 (full working app required to observe and verify transitions)
- **Has UI:** true
- **Route:** `/` (`index.html`)
- **Acceptance Criteria:**
  - New todos animate in smoothly (e.g. fade-in or slide-down) when added; there is no jarring "pop".
  - The strikethrough on a completed todo is animated (e.g. a brief transition), not instant.
  - Transitions work correctly on re-render — no flickering or double-animation artefacts.
  - Focus rings on the input and buttons are clearly visible (accessibility).
  - The styles file contains no `!important` declarations unless strictly necessary.
  - Emptying `styles.css` leaves the app fully functional (Tailwind classes carry all layout).
