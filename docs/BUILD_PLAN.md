# Build Plan — Todo App

> **Based on:** [docs/ARCHITECTURE.md](./ARCHITECTURE.md) · [docs/PRD.md](./PRD.md)
> **Date:** 2026-02-23
> **Stack:** Vanilla HTML/CSS/JS · Tailwind CDN · localStorage

---

## Overview

The implementation is ordered so that each task builds on a stable foundation:
**markup → data layer → rendering → controller → interactions → polish.**
No task requires knowledge of a later task to be completed or tested.

---

## Task 1: HTML Shell & Page Layout

- **Description:** Create `index.html` with the Tailwind CDN link, the page's visual skeleton (centered container, max-width 600px, header, input row, list area), and the three required DOM anchor elements: `#todo-input`, `#add-btn`, and `#todo-list`. Also create a `styles.css` stub with the file-level comment block. No JavaScript behaviour yet — this task produces only static, visual markup.
- **Files:**
  - `index.html` *(create)*
  - `styles.css` *(create)*
- **Dependencies:** None
- **Has UI:** true
- **Route:** `/` (open `index.html` directly in a browser)
- **Acceptance Criteria:**
  - Page renders without console errors
  - Tailwind CDN loads successfully (utility classes take effect)
  - Layout is centered, constrained to ≤ 600 px wide, with a visible card/shadow container
  - `<input id="todo-input">` is present and focusable
  - `<button id="add-btn">` is visible and labelled "Add"
  - `<ul id="todo-list">` is present in the DOM (may be empty)
  - Page is readable on a 375 px mobile viewport without horizontal scroll

---

## Task 2: TodoStore — Core State & Persistence

- **Description:** Implement the `TodoStore` object in `app.js`. This is the single source of truth for the todo list. Implement all six methods: `_load()` (hydrate from `localStorage` on init), `_save()` (serialize to `localStorage`), `getAll()` (return shallow copy of array), `add(text)` (create todo with `crypto.randomUUID()` + `Date.now()`, prepend, persist, return the new todo or `null` for empty text), `toggle(id)` (flip `completed`, persist), and `remove(id)` (delete by id, persist). The `Todo` shape is `{ id, text, completed, createdAt }`. No UI wiring in this task.
- **Files:**
  - `app.js` *(create)*
- **Dependencies:** None (can be developed before the HTML shell is finalised)
- **Has UI:** false
- **Acceptance Criteria:**
  - `TodoStore.add('Buy milk')` returns a `Todo` object with a UUID `id`, trimmed `text`, `completed: false`, and a numeric `createdAt`
  - `TodoStore.add('   ')` returns `null` and does not mutate the list
  - `TodoStore.getAll()` returns a copy; mutating it does not affect internal state
  - `TodoStore.toggle(id)` flips `completed`; calling it twice restores the original value
  - `TodoStore.remove(id)` reduces `getAll().length` by 1; calling with an unknown id is a no-op
  - After `add` / `toggle` / `remove`, `localStorage.getItem('todos')` contains valid JSON reflecting the new state
  - After a simulated page reload (call `TodoStore._load()` manually), state matches what was persisted

---

## Task 3: TodoStore — localStorage Error Handling

- **Description:** Harden `_save()` and `_load()` with `try/catch` blocks as specified in the architecture. `_save()` should catch quota-exceeded and disabled-storage errors, log a warning, and allow the in-memory session to continue. `_load()` should catch corrupt JSON, log a warning, and reset `this._todos` to `[]` rather than crashing.
- **Files:**
  - `app.js` *(modify — `_save` and `_load` methods only)*
- **Dependencies:** Task 2
- **Has UI:** false
- **Acceptance Criteria:**
  - Overriding `localStorage.setItem` to throw synchronously does not crash the app; `getAll()` still returns the current in-memory list
  - Setting `localStorage.todos` to the string `"CORRUPT"` before `_load()` results in `getAll()` returning `[]` with a `console.warn`, not an uncaught exception
  - Normal add/toggle/remove behaviour is unaffected by the added error guards

---

## Task 4: TodoRenderer — Sorting & DOM Rendering

- **Description:** Implement the `TodoRenderer` object in `app.js`. `_sortTodos(todos)` returns a new array sorted `(completed ASC, createdAt DESC)` — incomplete todos newest-first at the top, completed todos newest-first at the bottom. `_createItem(todo)` builds and returns a single `<li>` with `data-id` on the root, a checkbox (`data-action="toggle"`), a `<span class="todo-text">` for the text, and a delete `<button data-action="delete">`. Completed todos must have a strikethrough class on the text span. `render(todos)` clears `#todo-list` and appends the sorted items. No event listeners are attached here.
- **Files:**
  - `app.js` *(modify — add `TodoRenderer` object)*
- **Dependencies:** Task 1 (needs `#todo-list` in the DOM), Task 2 (needs the `Todo` shape)
- **Has UI:** false
- **Acceptance Criteria:**
  - Calling `TodoRenderer.render([])` leaves `#todo-list` empty (no stale child nodes)
  - Calling `render` with two incomplete and one completed todo places the completed item last in the DOM
  - Within the same completion group, newer (`createdAt`) todos appear before older ones
  - Each `<li>` has a `data-id` attribute matching its todo's `id`
  - Completed todo text spans carry the strikethrough CSS class; incomplete ones do not
  - Each item contains exactly one `data-action="toggle"` checkbox and one `data-action="delete"` button
  - Calling `render` twice with the same data produces identical DOM (idempotent)

---

## Task 5: TodoApp — Bootstrap & Add Todo

- **Description:** Implement the `TodoApp` controller object and call `TodoApp.init()` on `DOMContentLoaded`. `init()` must: call `TodoStore._load()` then `TodoRenderer.render(TodoStore.getAll())` to restore persisted state on page load. Wire the "add" flow: clicking `#add-btn` or pressing `Enter` in `#todo-input` calls `TodoStore.add(inputValue)`, then `TodoRenderer.render(TodoStore.getAll())`, then clears the input. If `add` returns `null` (empty text), skip rendering — validation feedback is handled in Task 8.
- **Files:**
  - `app.js` *(modify — add `TodoApp` object; add `<script src="app.js">` to `index.html` if not already present)*
  - `index.html` *(modify — add `<script src="app.js" defer>` if not already present)*
- **Dependencies:** Tasks 1, 2, 3, 4
- **Has UI:** true
- **Route:** `/`
- **Acceptance Criteria:**
  - On page load, todos persisted from a previous session appear in the list immediately
  - Typing text and clicking "Add" appends the todo to the list and clears the input
  - Typing text and pressing `Enter` in the input has the same effect as clicking "Add"
  - The new todo appears at the top of the incomplete group
  - `localStorage.todos` is updated after each add
  - After a hard reload, the added todos are still visible

---

## Task 6: TodoApp — Toggle Complete

- **Description:** Add event delegation to `TodoApp` on the `#todo-list` container listening for `change` events. When the event target is a checkbox with `data-action="toggle"`, read the `id` from `event.target.closest('[data-id]')`, call `TodoStore.toggle(id)`, then re-render. Guard against missing `[data-id]` ancestors by checking the result of `closest()` before proceeding.
- **Files:**
  - `app.js` *(modify — add delegated `change` listener inside `TodoApp.init`)*
- **Dependencies:** Task 5
- **Has UI:** true
- **Route:** `/`
- **Acceptance Criteria:**
  - Clicking a checkbox marks the todo as complete: text gains strikethrough styling
  - The now-completed todo moves to the bottom of the list on re-render
  - Clicking the checkbox again unchecks it: strikethrough is removed and the item returns to the top of the incomplete group
  - `localStorage` reflects the updated `completed` value after each toggle
  - Clicking elsewhere inside the list (not on a checkbox) does not trigger a toggle

---

## Task 7: TodoApp — Delete Todo

- **Description:** Add event delegation to `TodoApp` on `#todo-list` listening for `click` events. When the event target is a button with `data-action="delete"`, read the `id` from `event.target.closest('[data-id]')`, call `TodoStore.remove(id)`, then re-render. Guard against missing `[data-id]` using the same `closest()` null-check pattern as Task 6.
- **Files:**
  - `app.js` *(modify — add delegated `click` listener inside `TodoApp.init`)*
- **Dependencies:** Task 5
- **Has UI:** true
- **Route:** `/`
- **Acceptance Criteria:**
  - Clicking the ✕ button removes the todo from the visible list immediately
  - The removed todo does not reappear after a page reload
  - Deleting the only item in the list leaves `#todo-list` empty
  - Clicking anywhere else in the list (text, checkbox area) does not trigger deletion
  - `localStorage.todos` no longer contains the deleted todo's `id`

---

## Task 8: Input Validation UX

- **Description:** When a user attempts to add an empty or whitespace-only todo, provide visible feedback instead of silently doing nothing. The implementation should briefly apply an error CSS class to `#todo-input` (red outline) and/or trigger a shake animation, then remove the class after a short timeout so it can fire again on the next attempt. Define the shake keyframe animation and the error-state style in `styles.css`. The input must **not** be cleared on a failed submission.
- **Files:**
  - `app.js` *(modify — add error-state logic in the add handler)*
  - `styles.css` *(modify — add `.input-error` class and `@keyframes shake`)*
- **Dependencies:** Task 5
- **Has UI:** true
- **Route:** `/`
- **Acceptance Criteria:**
  - Clicking "Add" with an empty input applies a visible error style to `#todo-input` (red border or outline)
  - Pressing `Enter` on an empty input triggers the same error feedback
  - The error style disappears automatically after ~600 ms
  - No todo is added to the list or to `localStorage` on an invalid submission
  - The input value is preserved (not cleared) after a failed submission
  - The error can fire multiple times consecutively (the class is removed and re-added each time)

---

## Task 9: Empty State Placeholder

- **Description:** When the todo list is empty (either on first visit or after all todos are deleted), display a friendly placeholder message inside `#todo-list` such as "No todos yet — add one above!" `TodoRenderer.render()` is responsible for injecting or removing this placeholder. It must be absent whenever at least one todo exists.
- **Files:**
  - `app.js` *(modify — update `TodoRenderer.render` to handle empty array)*
  - `styles.css` *(modify — optional muted/italic style for the placeholder text)*
- **Dependencies:** Task 4
- **Has UI:** true
- **Route:** `/`
- **Acceptance Criteria:**
  - On first load with no persisted todos, the placeholder message is visible inside `#todo-list`
  - After adding at least one todo, the placeholder is no longer in the DOM
  - After deleting the last remaining todo, the placeholder reappears
  - The placeholder is not rendered as a `<li data-id>` element (it must not be treated as a todo by event delegation)

---

## Task 10: CSS Transitions & Visual Polish

- **Description:** Add smooth visual transitions as specified in the PRD. Because `TodoRenderer` does a full re-render, CSS entry animations are the practical approach: apply a fade-in + slight slide-down to newly appended `<li>` elements via a `@keyframes` animation tied to the element's initial render class. Also confirm overall visual polish: consistent spacing, hover states on buttons and checkboxes, and a subtle box-shadow on the card container.
- **Files:**
  - `styles.css` *(modify — add `@keyframes` for list item entry, hover styles, card shadow)*
  - `app.js` *(modify — `_createItem` may add an animation trigger class; no logic changes)*
- **Dependencies:** Tasks 4, 8 (polish layered on top of stable rendering and validation)
- **Has UI:** true
- **Route:** `/`
- **Acceptance Criteria:**
  - Adding a new todo produces a visible fade-in or slide-in animation on the new `<li>`
  - Deleting or toggling a todo re-renders the list without a jarring flash
  - The "Add" button and delete buttons have a visible hover state (colour or opacity change)
  - The card container has a visible drop-shadow separating it from the page background
  - No layout shift or scroll-jump occurs during any animation
  - Animations respect `prefers-reduced-motion`: when the media query is active, transitions are disabled or instantaneous

---

## Dependency Graph

```
Task 1 (HTML Shell)
    └── Task 4 (TodoRenderer)
            └── Task 5 (Bootstrap + Add)  ←── Task 2 (TodoStore)
                    │                               └── Task 3 (Error Handling)
                    ├── Task 6 (Toggle)
                    ├── Task 7 (Delete)
                    └── Task 8 (Validation UX)
            └── Task 9 (Empty State)
            └── Task 10 (Transitions)  ←── Task 8
```

## Recommended Implementation Order

| # | Task | Effort |
|---|---|---|
| 1 | HTML Shell & Layout | Small |
| 2 | TodoStore Core | Small |
| 3 | TodoStore Error Handling | Small |
| 4 | TodoRenderer | Medium |
| 5 | TodoApp Bootstrap + Add | Medium |
| 6 | Toggle Complete | Small |
| 7 | Delete Todo | Small |
| 8 | Input Validation UX | Small |
| 9 | Empty State Placeholder | Small |
| 10 | CSS Transitions & Polish | Medium |

Tasks 2 and 3 can be developed in parallel with Task 1 since they have no shared dependencies. Tasks 6, 7, and 8 can be worked in any order once Task 5 is complete. Tasks 9 and 10 can be done in any order once Task 4 is stable.
