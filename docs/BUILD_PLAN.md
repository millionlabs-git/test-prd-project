# Todo App - Build Plan

## Overview

Three sequential implementation tasks covering the full vertical slice of the application:
static HTML shell, custom CSS transitions, and all JavaScript logic. Each task produces
working, self-contained output that the next task builds on.

---

## Task 1: Create index.html — Page Shell and Static Structure

- **Description:** Create the single HTML page that serves as the application shell.
  The file must load Tailwind CSS from the official CDN, link `style.css` in `<head>`,
  and load `app.js` with a `defer` attribute. It must contain the full static structure:
  a centered page wrapper, an app container (`<div id="app">`), an `<h1>` title, an input
  row with `<input id="todo-input">` and `<button id="add-btn">`, and an empty
  `<ul id="todo-list">` that JavaScript will populate at runtime. Tailwind utility classes
  must be applied to every element as specified in the Architecture section 6 component
  table. Accessibility attributes (`placeholder`, `aria-label` on input and delete button)
  must be present.
- **Files:** `index.html` (create)
- **Dependencies:** None
- **Has UI:** true
- **Route:** /index.html (file open in browser)
- **Acceptance Criteria:**
  - Opening `index.html` in a browser renders a white card centered on a gray background
    with no horizontal scrollbar at 1024px viewport width.
  - The `<h1>` element contains the text "My Todos".
  - An `<input id="todo-input">` element exists with `placeholder="What needs to be done?"`
    and `aria-label="New todo text"`.
  - A `<button id="add-btn">` element exists and is visible.
  - A `<ul id="todo-list">` element exists and is empty in the static HTML source.
  - The Tailwind CDN `<script>` tag is present in `<head>` and utility classes (e.g.,
    `bg-gray-100`, `rounded-2xl`, `shadow-lg`) are applied and visually active — confirmed
    by inspecting computed styles.
  - `<link rel="stylesheet" href="style.css">` is present in `<head>`.
  - `<script src="app.js" defer>` is present and the page loads without console errors when
    `style.css` and `app.js` do not yet exist (deferred load means a 404 is non-blocking at
    this stage, but no JS runtime errors appear once both files exist).

---

## Task 2: Create style.css — Transitions and Custom Styles

- **Description:** Create the supplemental stylesheet that covers the three areas Tailwind
  CDN does not handle: entrance/exit transition keyframes for todo list items, a
  `line-through` helper class for completed todo text, and optional scrollbar styling on the
  list container. Define `.todo-item-enter` and `.todo-item-leave` classes using
  `@keyframes` or `opacity`/`transform` transitions. These classes will be toggled by
  `app.js` one `requestAnimationFrame` after a new `<li>` is inserted.
- **Files:** `style.css` (create)
- **Dependencies:** Task 1 (index.html must link the file for styles to apply)
- **Has UI:** false
- **Route:** N/A
- **Acceptance Criteria:**
  - Opening `index.html` after creating `style.css` produces no CSS parse errors in the
    browser DevTools console.
  - A `.todo-item-enter` rule exists in the file and defines either a `transition` or an
    `@keyframes` animation affecting `opacity` and/or `transform`.
  - A `.todo-item-leave` rule exists and defines an exit transition (e.g., fading out).
  - A `.completed-text` or equivalent rule exists that applies `text-decoration: line-through`
    (serves as a fallback to Tailwind's `line-through` utility class).
  - Manually adding `class="todo-item-enter"` to a test `<li>` in the browser DevTools
    produces a visible opacity or transform change confirming the animation rule is active.

---

## Task 3: Create app.js — State, Persistence, CRUD, Sorting, and Render

- **Description:** Create the complete JavaScript file that owns all application logic as
  described in Architecture section 5. The file must be structured as an IIFE or use a
  `DOMContentLoaded` listener as its entry point. It implements, in order: the `state`
  object, `loadTodos` and `persist` for localStorage I/O, `generateId` with a
  `crypto.randomUUID` primary path and `Math.random` fallback, the three CRUD functions
  (`addTodo`, `toggleTodo`, `deleteTodo`), `getSortedTodos` for display-time sorting,
  `render` and `createTodoElement` for full DOM redraw, `bindInput` to attach the Add
  button click and Enter keydown listeners, and finally `init` which loads persisted data,
  binds input, and calls the first render. Completed todo items must receive `line-through`
  and `text-gray-400` classes on their text span. The delete button must carry
  `aria-label="Delete todo"`. Entrance animation must be triggered via
  `requestAnimationFrame` by adding the `.todo-item-enter` class one frame after each
  `<li>` is appended.
- **Files:** `app.js` (create)
- **Dependencies:** Task 1, Task 2
- **Has UI:** true
- **Route:** /index.html (file open in browser)
- **Acceptance Criteria:**
  - Opening `index.html` with all three files present shows "No todos yet. Add one above!"
    when localStorage contains no `todos` key.
  - Typing text in the input and clicking "Add" appends a new todo to the top of the list
    without a page reload.
  - Pressing Enter while the input is focused also adds the todo and clears the input field.
  - Submitting an empty string or a whitespace-only string does not add any item to the list.
  - Clicking the checkbox on a todo moves it to the bottom of the list and applies visible
    strikethrough styling to its text.
  - Clicking the checkbox a second time on a completed todo moves it back to the incomplete
    section and removes the strikethrough styling.
  - Clicking the "x" delete button removes the todo from the list immediately with no page
    reload.
  - Reloading the page restores all todos that were present before reload, in the correct
    sorted order (incomplete newest-first at top, completed newest-first at bottom).
  - Opening DevTools > Application > localStorage confirms the `todos` key is updated after
    every add, toggle, and delete action.
  - When localStorage is cleared and the page reloaded the app renders the empty state
    message without errors.
  - Newly added `<li>` elements receive the `.todo-item-enter` class, producing the entrance
    animation defined in `style.css`.
  - Each delete button has `aria-label="Delete todo"` confirmed via DOM inspection.
