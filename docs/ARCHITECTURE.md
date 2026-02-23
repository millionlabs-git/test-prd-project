# Architecture Design Document — Todo App

**Version:** 1.0
**Date:** 2026-02-23
**Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Directory Structure](#directory-structure)
4. [Major Components](#major-components)
5. [Data Models & Schemas](#data-models--schemas)
6. [API Contracts (Module Interfaces)](#api-contracts-module-interfaces)
7. [Key Interfaces Between Components](#key-interfaces-between-components)
8. [Authentication & Authorization](#authentication--authorization)
9. [Error Handling Strategy](#error-handling-strategy)
10. [Architectural Decisions & Trade-offs](#architectural-decisions--trade-offs)

---

## Overview

The Todo App is a fully client-side, single-page web application. There is no backend server, no network requests, and no build pipeline. All state is managed in memory during the session and persisted to the browser's `localStorage` between reloads.

The architecture follows a lightweight **MVC-inspired separation** using plain ES6 JavaScript modules:

- **Model** — the `Todo` data structure and `StorageService`
- **Controller** — `TodoManager` (business logic and state)
- **View** — `UIRenderer` (DOM construction and updates) + `app.js` (event wiring)

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| **Markup** | HTML5 | Single `index.html` entry point; semantic elements |
| **Styling** | Tailwind CSS (CDN) + custom CSS | Utility-first styling with no build step; custom CSS handles transitions and animations not covered by Tailwind utilities |
| **Logic** | Vanilla JavaScript (ES6+) | No framework overhead; modules via `<script type="module">` |
| **Persistence** | `localStorage` | Zero-dependency, synchronous, browser-native key-value store; sufficient for single-user data at this scale |
| **Hosting** | Any static host (GitHub Pages, Netlify, Vercel) | No server-side execution required; deploy by uploading files |

> **No build step.** There is no Webpack, Vite, or bundler. Files are served directly as authored. This keeps the project instantly runnable: open `index.html` in a browser.

---

## Directory Structure

```
/
├── index.html              # Single HTML entry point
├── css/
│   └── styles.css          # Custom styles (transitions, animations, overrides)
├── js/
│   ├── app.js              # Entry point: init, event listener wiring
│   ├── storage.js          # localStorage read/write abstraction
│   ├── todoManager.js      # Business logic: add, delete, toggle, sort
│   └── uiRenderer.js       # DOM construction and rendering
└── docs/
    ├── PRD.md
    └── ARCHITECTURE.md     # This document
```

### Rationale for the Split

| File | Responsibility |
|---|---|
| `app.js` | **Orchestrator.** Imports all modules, calls `init()`, attaches event listeners, delegates user actions to `TodoManager`, then triggers `UIRenderer` re-renders. Contains no business logic and no raw DOM queries beyond the top-level containers. |
| `storage.js` | **Persistence boundary.** The only file that touches `localStorage`. Everything else reads/writes todos through this module, making it easy to swap the storage backend (e.g., `IndexedDB`, a REST API) later. |
| `todoManager.js` | **Single source of truth.** Holds the in-memory `todos` array. All mutations (add, delete, toggle) go through here. Returns the sorted, canonical list after every operation. |
| `uiRenderer.js` | **View layer.** Receives a `Todo[]` snapshot and produces DOM. Has no knowledge of storage or business rules. All DOM updates are full re-renders (acceptable at this scale). |

---

## Major Components

### 1. `app.js` — Application Entry Point

**Responsibilities:**
- Call `init()` on page load to hydrate state from storage and render the initial list.
- Attach event listeners to the `#add-btn` button and `#new-todo-input` field (Enter key).
- Attach a single delegated event listener to the `#todo-list` container for checkbox toggles and delete clicks (avoids re-binding on every render).
- Act as the bridge between user input events and `TodoManager` + `UIRenderer`.

**Does NOT:**
- Contain business logic.
- Directly read from or write to `localStorage`.
- Build any DOM elements itself.

---

### 2. `storage.js` — Storage Service

**Responsibilities:**
- Serialize and deserialize the `Todo[]` array to/from `localStorage`.
- Provide a clean interface (`load`, `save`) to isolate the rest of the app from `localStorage` API details.
- Handle JSON parse errors and storage quota errors gracefully (see [Error Handling](#error-handling-strategy)).

---

### 3. `todoManager.js` — Todo Manager

**Responsibilities:**
- Maintain the authoritative in-memory `todos: Todo[]` array.
- Expose pure operations: `addTodo`, `deleteTodo`, `toggleTodo`.
- Expose `getSortedTodos()` which returns a sorted copy: incomplete todos first (newest first), then completed todos (newest first).
- Persist to `StorageService` after every mutation.

**Does NOT:**
- Render anything to the DOM.
- Know anything about `localStorage` directly.

---

### 4. `uiRenderer.js` — UI Renderer

**Responsibilities:**
- Accept a `Todo[]` array and render the full list into `#todo-list`.
- Build individual todo elements: checkbox, text span, delete button.
- Apply Tailwind utility classes and visual states (strikethrough for completed, transition classes).
- Clear the input field after a successful add.

**Does NOT:**
- Hold any state.
- Trigger any side effects (no storage writes, no business logic).

---

## Data Models & Schemas

### `Todo` Object

```javascript
/**
 * @typedef {Object} Todo
 * @property {string}  id          - Unique identifier (crypto.randomUUID() or timestamp + random suffix)
 * @property {string}  text        - The todo's display text (trimmed, non-empty)
 * @property {boolean} completed   - Whether the todo is marked done
 * @property {number}  createdAt   - Unix timestamp (ms) at time of creation
 */
```

**Example:**
```json
{
  "id": "k7f2a1b9-c3d4-4e5f-8a6b-1c2d3e4f5a6b",
  "text": "Buy groceries",
  "completed": false,
  "createdAt": 1740312000000
}
```

### `localStorage` Schema

| Key | Type | Description |
|---|---|---|
| `"todos"` | `string` (JSON) | `JSON.stringify(Todo[])` — the full array of todos |

**Example stored value:**
```json
[
  { "id": "abc123", "text": "Buy groceries", "completed": false, "createdAt": 1740312000000 },
  { "id": "def456", "text": "Read a book",   "completed": true,  "createdAt": 1740225600000 }
]
```

> The entire array is written atomically on every mutation. At typical todo-list scale (< 10,000 items), this is negligible in performance cost and keeps the implementation simple.

---

## API Contracts (Module Interfaces)

Since there is no HTTP backend, "API contracts" describe the **public interfaces of each JavaScript module**.

---

### `StorageService` (`storage.js`)

```typescript
// Load all todos from localStorage.
// Returns an empty array if no data exists or data is corrupt.
function load(): Todo[]

// Persist the full todos array to localStorage.
// Throws StorageQuotaError if localStorage is full (caught by caller).
function save(todos: Todo[]): void
```

---

### `TodoManager` (`todoManager.js`)

```typescript
// Initialize internal state by loading from StorageService.
// Must be called once at app startup.
function init(): void

// Create a new Todo, prepend it to the list, persist, and return the sorted list.
// Throws ValidationError if text is empty after trimming.
function addTodo(text: string): Todo[]

// Remove the todo with the given id, persist, and return the sorted list.
// No-op (silent) if id is not found.
function deleteTodo(id: string): Todo[]

// Flip the `completed` flag on the todo with the given id, persist,
// and return the sorted list.
// No-op (silent) if id is not found.
function toggleTodo(id: string): Todo[]

// Return a sorted copy of the current todos:
//   1. Incomplete todos, newest first (descending createdAt)
//   2. Completed todos, newest first (descending createdAt)
// Does not mutate internal state.
function getSortedTodos(): Todo[]
```

---

### `UIRenderer` (`uiRenderer.js`)

```typescript
// Fully re-render the #todo-list element with the provided todos.
// Clears the container and rebuilds all child elements.
function renderTodos(todos: Todo[]): void

// Build and return a single <li> element for a todo.
// The element includes a checkbox, text span, and delete button.
// data-id attributes are used for event delegation in app.js.
function buildTodoElement(todo: Todo): HTMLLIElement

// Clear the text input field (#new-todo-input).
function clearInput(): void
```

---

### Event Delegation Contract (`app.js`)

Rather than attaching listeners to each todo element (which would be lost on re-render), `app.js` uses a **single delegated listener** on `#todo-list`. Target actions are identified via `data-*` attributes on child elements:

| Element | `data-*` attributes | Action triggered |
|---|---|---|
| `<input type="checkbox">` | `data-id="{todo.id}"` | `TodoManager.toggleTodo(id)` |
| `<button>` (delete) | `data-id="{todo.id}"`, `data-action="delete"` | `TodoManager.deleteTodo(id)` |

---

## Key Interfaces Between Components

```
┌─────────────────────────────────────────────────────────┐
│                        index.html                       │
│  Loads Tailwind CDN, custom CSS, and                    │
│  <script type="module" src="js/app.js">                 │
└────────────────────┬────────────────────────────────────┘
                     │ imports
                     ▼
┌─────────────────────────────────────────────────────────┐
│                        app.js                           │
│  • Calls TodoManager.init() on DOMContentLoaded         │
│  • Attaches listeners to #add-btn and #new-todo-input   │
│  • Delegated listener on #todo-list                     │
│  • On any state change:                                 │
│      UIRenderer.renderTodos(TodoManager.getSortedTodos) │
└───────┬──────────────────────────────┬──────────────────┘
        │ imports                      │ imports
        ▼                              ▼
┌───────────────────┐       ┌──────────────────────────┐
│   todoManager.js  │       │      uiRenderer.js        │
│  • Owns Todo[]    │       │  • Builds DOM elements    │
│  • Validates      │       │  • Applies Tailwind classes│
│  • Sorts          │       │  (reads Todo[], no writes) │
│  • Calls storage  │       └──────────────────────────┘
└───────┬───────────┘
        │ imports
        ▼
┌──────────────────┐
│   storage.js     │
│  • localStorage  │
│    read / write  │
└──────────────────┘
```

**Data flow on a user action (e.g., "Add Todo"):**

```
User types text → presses Enter or clicks Add
  → app.js catches event
  → calls TodoManager.addTodo(text)
    → validates text (throws if empty)
    → creates Todo object
    → prepends to internal array
    → calls StorageService.save(todos)
    → returns getSortedTodos()
  → app.js passes sorted list to UIRenderer.renderTodos(todos)
    → clears #todo-list
    → builds and appends <li> for each todo
  → UIRenderer.clearInput()
```

---

## Authentication & Authorization

**Not applicable.** This is a single-user, purely client-side application.

- There is no login, session, or user identity.
- `localStorage` is automatically scoped to the origin (`scheme://host:port`) by the browser — no two websites can read each other's data.
- No network requests are made, so there is no attack surface for credential theft or unauthorized API access.

> **Future consideration:** If multi-user or cloud-sync support is ever added, authentication would be introduced at the storage boundary (`storage.js`) by replacing it with an authenticated API client, leaving all other modules unchanged.

---

## Error Handling Strategy

All errors are either **prevented proactively** (validation) or **caught and recovered gracefully** (runtime). The app should never surface a raw JavaScript error to the user.

### Validation Errors (Prevented Before State Mutation)

| Scenario | Where caught | Response |
|---|---|---|
| User submits empty or whitespace-only input | `TodoManager.addTodo()` | Throws `ValidationError`; `app.js` briefly highlights the input field — no todo is created, no storage write occurs |

### Storage Errors (Caught at the Boundary)

| Scenario | Where caught | Response |
|---|---|---|
| `localStorage` is full (`QuotaExceededError`) | `StorageService.save()` | Catches the error, logs to console, surfaces a non-blocking inline message: *"Could not save — storage is full."* In-memory state remains valid for the current session. |
| Corrupt or non-JSON data in `localStorage` | `StorageService.load()` | Catches `SyntaxError` from `JSON.parse`, logs a warning, returns `[]` so the app starts with a clean slate rather than crashing. |

### Runtime Errors (Defensive Programming)

| Scenario | Where handled | Response |
|---|---|---|
| `toggleTodo` / `deleteTodo` called with unknown id | `TodoManager` | Silent no-op (the todo may have already been removed); re-render with current state |
| `crypto.randomUUID()` unavailable (very old browsers) | ID generation utility | Fallback: `Date.now().toString(36) + Math.random().toString(36).slice(2)` |

### Error Propagation Convention

```
StorageService  →  throws named errors (QuotaExceededError, SyntaxError)
TodoManager     →  catches StorageService errors, re-throws or handles at boundary
                →  throws ValidationError for invalid input
app.js          →  catches all errors from TodoManager, updates UI feedback
UIRenderer      →  must never throw; all rendering is defensive (null/undefined guards)
```

---

## Architectural Decisions & Trade-offs

### ADR-001: No Framework (Vanilla JS)

**Decision:** Use plain HTML/CSS/JS with no React, Vue, or Svelte.
**Pros:** Zero dependencies, no build toolchain, instant load, simple mental model, matches PRD spec.
**Cons:** No virtual DOM diffing — full list re-render on every change; no ecosystem of pre-built components.
**Alternatives considered:** React (overkill), Alpine.js (reasonable, but adds a CDN dependency without meaningful benefit here).
**Verdict:** The PRD explicitly specifies vanilla JS. At < 1,000 todos, full DOM re-render is imperceptibly fast.

---

### ADR-002: Full Re-render vs. Incremental DOM Updates

**Decision:** On every state change, `UIRenderer` clears `#todo-list` and rebuilds all `<li>` elements from scratch.
**Pros:** Simple, always correct, no stale-element bugs, easy to reason about.
**Cons:** Every user interaction re-renders the whole list. For < 500 todos this takes < 1ms.
**Alternatives:** Manually diff and patch individual elements. Adds ~80 lines of bookkeeping code for no perceptible benefit at this scale.
**Verdict:** Full re-render. Revisit only if performance profiling shows jank at very large list sizes.

---

### ADR-003: `localStorage` vs. `IndexedDB`

**Decision:** Use `localStorage`.
**Pros:** Synchronous, simple string API, universally supported, zero setup.
**Cons:** 5–10 MB limit per origin; synchronous writes block the main thread (negligible for small payloads); strings only (JSON serialization required).
**Alternatives:** `IndexedDB` — async, larger quota, supports structured data. Adds significant complexity (Promise wrappers, cursor API) for no practical benefit at todo-list scale.
**Verdict:** `localStorage` is the correct tool for this use case.

---

### ADR-004: Sort on Read, Store Unsorted

**Decision:** Sort order is applied in `TodoManager.getSortedTodos()` on every read, not persisted.
**Pros:** Sort order is always derived deterministically from `completed` + `createdAt`; no risk of stale sort positions in stored data; storage stays simple.
**Cons:** O(n log n) sort on every render. Negligible at todo-list scale.
**Verdict:** Sort on read. Storage always holds the raw, unsorted array.

---

### ADR-005: Event Delegation for Todo Actions

**Decision:** Attach a single listener to `#todo-list` rather than per-element listeners on each checkbox/button.
**Pros:** Listeners survive full re-renders without re-binding; single, predictable attach point; simpler `app.js` lifecycle.
**Cons:** Slightly more complex event target inspection (`event.target.closest('[data-id]')`).
**Verdict:** Event delegation is the standard pattern for dynamically rendered lists and the correct choice here.
