# Architecture Design Document — Todo App

> **Status:** Draft
> **Date:** 2026-02-23
> **References:** [PRD.md](./PRD.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Directory Structure](#directory-structure)
4. [Major Components](#major-components)
5. [Data Models & Schemas](#data-models--schemas)
6. [Internal Module API Contracts](#internal-module-api-contracts)
7. [Component Interfaces](#component-interfaces)
8. [Authentication & Authorization](#authentication--authorization)
9. [Error Handling Strategy](#error-handling-strategy)
10. [Architectural Decisions & Trade-offs](#architectural-decisions--trade-offs)

---

## Overview

The Todo App is a **fully client-side, single-page application** with no backend, no build step, and no external dependencies beyond Tailwind CSS (loaded via CDN). State lives in memory during a session and is persisted to `localStorage` between reloads.

The architecture follows a lightweight **unidirectional data flow**:

```
User Interaction → App (event handler)
                      │
                      ▼
                   Store (mutate state + persist)
                      │
                      ▼
                 Renderer (re-render DOM from state)
```

This keeps the code predictable: the Store is the single source of truth, and the Renderer is a pure projection of that state onto the DOM.

---

## Tech Stack

| Concern         | Choice                        | Rationale                                                           |
|-----------------|-------------------------------|---------------------------------------------------------------------|
| Markup          | HTML5                         | No framework overhead; sufficient for a single-page app             |
| Styling         | Tailwind CSS (CDN)            | Utility-first classes; no build step required                       |
| Custom CSS      | Plain CSS (`styles.css`)      | Transitions, animations, and one-off rules not covered by Tailwind  |
| Logic           | Vanilla JavaScript (ES6+)     | PRD constraint; modules via `type="module"` keep files decoupled    |
| Persistence     | `localStorage` (browser API)  | Zero-config, offline-capable, appropriate for single-user data      |
| Hosting         | Any static file host          | GitHub Pages, Netlify, Vercel, or local `file://` — no server needed |

**No build tools, bundlers, or package managers are required.**

---

## Directory Structure

```
/
├── index.html            # Single HTML entry point; loads Tailwind CDN + JS modules
├── css/
│   └── styles.css        # Custom styles: transitions, focus rings, overrides
├── js/
│   ├── app.js            # Bootstrap: reads initial state, wires DOM event listeners
│   ├── store.js          # State manager: in-memory todos + localStorage persistence
│   ├── renderer.js       # DOM renderer: builds/updates the todo list from state
│   └── todo.js           # Todo factory: creates a well-shaped Todo object
├── docs/
│   ├── PRD.md
│   └── ARCHITECTURE.md   # (this file)
└── README.md
```

### File Responsibilities at a Glance

| File              | Role                                                                 |
|-------------------|----------------------------------------------------------------------|
| `index.html`      | Shell; imports Tailwind CDN, links `styles.css`, loads `app.js`      |
| `css/styles.css`  | Smooth transitions, strikethrough animation, scrollbar polish        |
| `js/todo.js`      | Pure factory function — no side effects                              |
| `js/store.js`     | All state mutations and localStorage I/O                             |
| `js/renderer.js`  | All DOM mutations; receives data, never reads from Store directly     |
| `js/app.js`       | Glues everything: imports Store + Renderer, attaches event listeners |

---

## Major Components

### 1. `todo.js` — Todo Factory

**Responsibility:** Produce a correctly-shaped, immutable-by-convention Todo object.

- Generates a unique `id` using `crypto.randomUUID()` (falls back to `Date.now() + Math.random()`)
- Stamps a `createdAt` timestamp
- Sets `completed: false` by default

No DOM access. No side effects. Easily testable in isolation.

---

### 2. `store.js` — State Manager

**Responsibility:** Own and mutate the canonical list of todos; synchronise with `localStorage`.

- Maintains a private `todos: Todo[]` array in module scope
- Exposes CRUD operations that always return a fresh copy of state (no mutations of returned arrays)
- Automatically calls `save()` after every write operation
- `load()` is called once on startup by `app.js`

**Sort order rule (enforced in `getAll`):**
1. Incomplete todos sorted by `createdAt` descending (newest first)
2. Completed todos sorted by `createdAt` descending, appended after incomplete

---

### 3. `renderer.js` — DOM Renderer

**Responsibility:** Given a `Todo[]`, produce the correct DOM inside the list container.

- Performs a **full re-render** on every state change (acceptable for ≤ hundreds of items)
- Builds each `<li>` element via `document.createElement` (no `innerHTML` for list items to avoid XSS)
- Applies Tailwind classes and CSS transitions declaratively
- Does **not** import Store; receives data only through function arguments

---

### 4. `app.js` — Application Bootstrap

**Responsibility:** Entry point; wire up the event system; coordinate Store → Renderer cycle.

- Queries DOM element references once on load
- Registers event listeners: `form submit`, `keydown Enter`, `click` (delegated on the list)
- Calls `store.load()` then `renderer.renderList(store.getAll())` on `DOMContentLoaded`
- All event handlers follow the pattern: **call Store → call Renderer with fresh state**

---

## Data Models & Schemas

### Todo Object

```js
/**
 * @typedef {Object} Todo
 * @property {string}  id          - Unique identifier (UUID or timestamp+random)
 * @property {string}  text        - The todo's display text (trimmed, non-empty)
 * @property {boolean} completed   - Whether the todo has been checked off
 * @property {number}  createdAt   - Unix timestamp (ms) from Date.now()
 */
```

**Example:**
```json
{
  "id": "a3f8c1d2-...",
  "text": "Buy groceries",
  "completed": false,
  "createdAt": 1740316800000
}
```

### localStorage Schema

| Key     | Type   | Value                               |
|---------|--------|-------------------------------------|
| `todos` | string | `JSON.stringify(Todo[])` — an array |

The key is fixed at `"todos"`. On first load (key absent), the Store defaults to `[]`.

**Serialisation contract:** Only properties defined in the Todo typedef above are written. No functions or circular references. Safe to `JSON.parse` without a reviver.

---

## Internal Module API Contracts

Because this app has no HTTP backend, "API contracts" describe the **JavaScript module interfaces** that components expose to each other.

### `todo.js`

```js
/**
 * Creates a new Todo object.
 * @param {string} text - Non-empty, already-trimmed todo text
 * @returns {Todo}
 */
export function createTodo(text): Todo
```

---

### `store.js`

```js
/**
 * Load persisted todos from localStorage into memory.
 * Call once on app startup. Safe to call multiple times (idempotent reads).
 * @returns {void}
 */
export function load(): void

/**
 * Return a sorted copy of all todos (incomplete first, completed last).
 * Never returns the internal array reference.
 * @returns {Todo[]}
 */
export function getAll(): Todo[]

/**
 * Add a new todo. Persists automatically.
 * @param {string} text - Must be non-empty after trimming; throws if empty
 * @returns {Todo}       - The newly created todo
 */
export function add(text: string): Todo

/**
 * Toggle the completed state of a todo. Persists automatically.
 * @param {string} id - ID of the todo to toggle; no-ops if not found
 * @returns {void}
 */
export function toggle(id: string): void

/**
 * Permanently remove a todo. Persists automatically.
 * @param {string} id - ID of the todo to remove; no-ops if not found
 * @returns {void}
 */
export function remove(id: string): void
```

---

### `renderer.js`

```js
/**
 * Fully re-render the todo list container from the given todos array.
 * Clears previous children and rebuilds from scratch.
 * @param {HTMLElement} listEl - The <ul> container element
 * @param {Todo[]}      todos  - Sorted array from store.getAll()
 * @returns {void}
 */
export function renderList(listEl: HTMLElement, todos: Todo[]): void

/**
 * Clear the text input field after a successful add.
 * @param {HTMLInputElement} inputEl
 * @returns {void}
 */
export function clearInput(inputEl: HTMLInputElement): void
```

> **Note:** `renderer.js` never imports `store.js`. All data flows in through function parameters.

---

## Component Interfaces

The diagram below shows how data and control flow between modules:

```
┌─────────────────────────────────────────────────────┐
│                     index.html                      │
│   <script type="module" src="js/app.js">            │
└────────────────────────┬────────────────────────────┘
                         │ imports
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
      store.js      renderer.js     (todo.js used
          │              │           internally by
          │ getAll() ────►             store.js)
          │              │
          │   store.add / toggle / remove
          ◄──────── app.js (event handlers) ─────────
                         │
                    DOM events
                (submit, click, keydown)
                         │
                      Browser
```

**Key rules:**
- `app.js` is the **only** module that imports from both `store` and `renderer`
- `renderer.js` has **no** knowledge of `store.js`
- `todo.js` has **no** knowledge of any other module

---

## Authentication & Authorization

**Not applicable.** This application has no user accounts, no server, and no network requests. All data is scoped to the user's browser profile via `localStorage`.

If multi-user or cloud-sync capabilities were added in a future version, the recommended path would be:

1. **Auth:** Supabase Auth (email/password or OAuth) — drop-in, no backend required for a simple app
2. **Storage:** Replace `localStorage` calls in `store.js` with Supabase Realtime DB calls — only one file changes
3. **Authorization:** Row-Level Security policies on the todos table, keyed by `user_id`

The module boundary around `store.js` makes this migration localised and low-risk.

---

## Error Handling Strategy

### 1. Empty Input Guard (UI layer — `app.js`)
```js
const text = inputEl.value.trim();
if (!text) return; // silently ignore; no error message needed per PRD
```

### 2. localStorage Read Failures (`store.js` — `load()`)
`localStorage` can throw in Private Browsing mode or when storage is disabled by policy.

```js
export function load() {
  try {
    const raw = localStorage.getItem('todos');
    todos = raw ? JSON.parse(raw) : [];
  } catch {
    // Corrupted JSON or access denied — start with empty list
    todos = [];
  }
}
```

### 3. localStorage Write Failures (`store.js` — `save()`)
Writes can fail if the storage quota is exceeded.

```js
function save() {
  try {
    localStorage.setItem('todos', JSON.stringify(todos));
  } catch {
    // Quota exceeded — state is still correct in memory for the current session.
    // Optional: surface a transient UI warning banner (future enhancement).
    console.warn('[TodoApp] Could not persist todos: localStorage unavailable or full.');
  }
}
```

### 4. Invalid Todo ID (Store mutations)
`toggle` and `remove` silently no-op when the given `id` is not found. This is safe because IDs come only from rendered list items, which always reflect current state.

### 5. Corrupted localStorage Data
If `JSON.parse` yields a non-array (e.g. a string or object), `load()` resets to `[]`:

```js
if (!Array.isArray(todos)) todos = [];
```

### Error Escalation Policy
| Error Type              | Handling         | User Visible? |
|-------------------------|------------------|---------------|
| Empty input             | Silent no-op     | No            |
| localStorage read fail  | Default to `[]`  | No            |
| localStorage write fail | Console warning  | No (v1)       |
| Corrupted data          | Reset to `[]`    | No            |

All errors are either non-destructive recoveries or silent guards. There are no unhandled exceptions in the happy path. Browser-level JavaScript errors (syntax, module load failures) are out of scope for runtime handling.

---

## Architectural Decisions & Trade-offs

### ADR-001: Full Re-render vs. Incremental DOM Updates

**Decision:** Full list re-render on every state change (`renderer.renderList` replaces all children).

| | Detail |
|---|---|
| **Pro** | Simple, no diff logic, no stale-DOM bugs, trivially correct |
| **Pro** | Sufficient performance for ≤ hundreds of todos |
| **Con** | CSS transitions on individual items require care (use `animation` on new items, not transitions that rely on element identity) |
| **Alternative** | Virtual DOM diffing (React-style) — massive overkill; a framework would need to be added |
| **Rationale** | PRD explicitly prohibits frameworks. Full re-render is the simplest correct approach. |

---

### ADR-002: Module-based JS with `type="module"` vs. Concatenated Script

**Decision:** Use ES Modules (`<script type="module">`).

| | Detail |
|---|---|
| **Pro** | Native scoping — no global variable collisions |
| **Pro** | Explicit `import`/`export` makes dependencies visible |
| **Pro** | Supported by all modern browsers; no bundler needed |
| **Con** | Requires a server (or `file://` with CORS relaxed) for local dev — a simple `python -m http.server` suffices |
| **Alternative** | Single concatenated `app.js` — hard to maintain, global scope pollution |

---

### ADR-003: localStorage as Persistence Layer

**Decision:** Use `localStorage` with JSON serialisation.

| | Detail |
|---|---|
| **Pro** | Zero setup, works offline, synchronous API is simple |
| **Pro** | PRD requirement |
| **Con** | ~5 MB storage limit (non-issue for todos) |
| **Con** | Not shared across devices or browser profiles |
| **Con** | Synchronous — blocks main thread on large payloads (non-issue here) |
| **Migration path** | All persistence is encapsulated in `store.js`; swap to IndexedDB or a remote DB by changing only that one file |

---

### ADR-004: Sort Order Implementation

**Decision:** Sort is applied in `store.getAll()`, not stored in `localStorage`.

| | Detail |
|---|---|
| **Pro** | Storage format stays simple (insertion order) |
| **Pro** | Sort logic can change without a data migration |
| **Con** | Tiny O(n log n) cost on every render (negligible for todo-scale data) |
| **Rationale** | Separation of "what the data is" (storage) vs. "how it's presented" (view) |

---

*End of Architecture Document*
