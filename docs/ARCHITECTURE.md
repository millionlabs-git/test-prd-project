# Architecture Design Document — Todo App

> **Status:** Draft
> **Date:** 2026-02-23
> **PRD:** [docs/PRD.md](./PRD.md)

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Directory Structure](#directory-structure)
3. [Major Components](#major-components)
4. [Data Models & Schemas](#data-models--schemas)
5. [API Contracts](#api-contracts)
6. [Key Interfaces Between Components](#key-interfaces-between-components)
7. [Authentication & Authorization](#authentication--authorization)
8. [Error Handling Strategy](#error-handling-strategy)

---

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Markup | HTML5 | Single static file; no build step needed |
| Styling | Tailwind CSS via CDN | Utility-first, zero-config, matches PRD requirement |
| Logic | Vanilla JavaScript (ES6+) | No framework overhead for a small, self-contained app |
| Persistence | `localStorage` | Browser-native, no server required, survives page reloads |
| Hosting | Any static file host (e.g. GitHub Pages, Netlify, Vercel) | Pure static assets; no server-side runtime |

**No build tooling, no bundler, no package manager.** The entire app ships as two files: `index.html` and `app.js` (optionally a `styles.css` for any custom CSS not expressible in Tailwind utilities alone).

---

## Directory Structure

```
todo-app/
├── index.html          # App shell — markup, Tailwind CDN link, script tag
├── app.js              # All JavaScript: store, renderer, event wiring
├── styles.css          # (Optional) Custom CSS overrides / transitions
└── docs/
    ├── PRD.md
    └── ARCHITECTURE.md
```

### Rationale

The PRD specifies vanilla JS with no frameworks. A flat structure with a single HTML entry point and a single JS module is the simplest correct answer. Splitting further (e.g., `store.js`, `ui.js`) would require ES module `<script type="module">` imports or a bundler — unnecessary complexity for this scope.

---

## Major Components

The application is divided into three logical layers inside `app.js`, implemented as plain JavaScript objects / closures.

### 1. `TodoStore` — State & Persistence

**Responsibility:** Single source of truth for the todo list. Owns all reads and writes to `localStorage`. Exposes a clean API so the UI layer never touches storage directly.

| Method | Description |
|---|---|
| `getAll()` | Returns the current in-memory array of todos |
| `add(text)` | Creates a new todo, prepends it, persists, returns the new todo |
| `toggle(id)` | Flips `completed` on a todo, persists |
| `remove(id)` | Deletes a todo by id, persists |
| `_load()` | Private — hydrates in-memory state from `localStorage` on init |
| `_save()` | Private — serializes in-memory state to `localStorage` |

### 2. `TodoRenderer` — DOM Rendering

**Responsibility:** Pure rendering. Receives the current todo array and produces the correct DOM. Knows nothing about storage or events — only how to turn data into HTML elements.

| Method | Description |
|---|---|
| `render(todos)` | Clears the list container and re-renders every todo item |
| `_createItem(todo)` | Builds and returns a single `<li>` DOM node for a todo |
| `_sortTodos(todos)` | Returns a new array: incomplete todos first, completed at the bottom |

**Rendering strategy:** Full re-render on every state change. Given the small data set (localStorage is capped at ~5 MB; typical usage is dozens of todos), a virtual-DOM diffing strategy is unnecessary overhead.

### 3. `TodoApp` — Event Wiring & Controller

**Responsibility:** Bootstrap the application. Attach all event listeners. Coordinate between `TodoStore` and `TodoRenderer` by calling render after every state mutation.

| Responsibility | Details |
|---|---|
| Initialize | Call `TodoStore._load()` and `TodoRenderer.render()` on `DOMContentLoaded` |
| Add todo | Listen for `click` on the Add button and `keydown` (Enter) on the input |
| Toggle todo | Use event delegation on the list container, handle `change` on checkboxes |
| Delete todo | Use event delegation on the list container, handle `click` on delete buttons |

**Event delegation** is used for toggle and delete instead of attaching listeners to individual items. This avoids listener leaks when items are removed and re-created on full re-renders.

---

## Data Models & Schemas

### `Todo` Object

```js
{
  id:        string,   // crypto.randomUUID() — globally unique identifier
  text:      string,   // User-supplied todo content; trimmed, non-empty
  completed: boolean,  // false = active, true = done
  createdAt: number    // Date.now() timestamp; used to preserve insertion order
}
```

### `localStorage` Schema

| Key | Value type | Description |
|---|---|---|
| `"todos"` | `JSON string` | Serialized `Todo[]` array |

**Example stored value:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "text": "Buy groceries",
    "completed": false,
    "createdAt": 1740316800000
  },
  {
    "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "text": "Walk the dog",
    "completed": true,
    "createdAt": 1740230400000
  }
]
```

**Sort order:** `TodoRenderer._sortTodos` sorts by `(completed ASC, createdAt DESC)` — incomplete todos first (newest at top), completed todos last (newest at top within their group).

---

## API Contracts

This is a fully client-side application with **no HTTP API**. The "API" is the JavaScript interface between modules.

### `TodoStore` Interface

```js
// Returns a shallow copy of the todos array (never mutate directly)
TodoStore.getAll() → Todo[]

// Validates text (trim, non-empty), generates id + createdAt, persists
TodoStore.add(text: string) → Todo | null   // null if text is empty after trim

// Flips todo.completed; no-op if id not found
TodoStore.toggle(id: string) → void

// Removes todo with matching id; no-op if id not found
TodoStore.remove(id: string) → void
```

### `TodoRenderer` Interface

```js
// Accepts the canonical todos array, re-renders the #todo-list element
TodoRenderer.render(todos: Todo[]) → void
```

### DOM Element Contracts

The HTML must expose the following stable element IDs that `TodoApp` and `TodoRenderer` depend on:

| Element ID | Tag | Purpose |
|---|---|---|
| `#todo-input` | `<input type="text">` | User types new todo here |
| `#add-btn` | `<button>` | Triggers add action |
| `#todo-list` | `<ul>` | Container rendered into by `TodoRenderer` |

Todo item elements use `data-*` attributes to carry identity:

```html
<li data-id="550e8400-...">
  <input type="checkbox" data-action="toggle">
  <span class="todo-text">Buy groceries</span>
  <button data-action="delete">✕</button>
</li>
```

Event delegation in `TodoApp` reads `event.target.closest('[data-id]')` to find the owning todo and `event.target.dataset.action` to determine the operation.

---

## Key Interfaces Between Components

```
┌─────────────────────────────────────────────────┐
│                   index.html                    │
│  #todo-input  #add-btn  #todo-list              │
└────────────────────┬────────────────────────────┘
                     │ DOM events
                     ▼
┌─────────────────────────────────────────────────┐
│                   TodoApp                       │
│  (event wiring + controller)                    │
│                                                 │
│  on add  ──► TodoStore.add(text)                │
│  on toggle ► TodoStore.toggle(id)               │
│  on delete ► TodoStore.remove(id)               │
│                                                 │
│  after every mutation:                          │
│  TodoRenderer.render(TodoStore.getAll())        │
└──────────┬──────────────────┬───────────────────┘
           │                  │
           ▼                  ▼
┌──────────────────┐  ┌───────────────────────────┐
│   TodoStore      │  │     TodoRenderer           │
│                  │  │                            │
│  in-memory array │  │  Reads Todo[]              │
│  ◄──► localStorage  │  Writes to #todo-list DOM  │
└──────────────────┘  └───────────────────────────┘
```

**Data flows in one direction:** user action → `TodoApp` → `TodoStore` mutation → `TodoRenderer.render()` → DOM update. No component reaches "sideways" into another; all coordination goes through `TodoApp`.

---

## Authentication & Authorization

**Not applicable.** This is a single-user, browser-local application. All data lives in the user's own `localStorage` — there is no server, no accounts, and no multi-user scenario. No auth layer is needed.

If the app is later extended to sync todos to a server, the recommended approach would be:

- **Authentication:** JWT stored in `httpOnly` cookie (not `localStorage`) to prevent XSS token theft.
- **Authorization:** Server-side ownership check (`WHERE user_id = $currentUser`) on every read/write endpoint.

---

## Error Handling Strategy

Because this is a pure client-side app with no network calls, the failure surface is small. The strategy is **silent prevention over loud error dialogs**.

### Input Validation

| Scenario | Handling |
|---|---|
| User submits empty input | `TodoStore.add()` returns `null`; no item created; input field shakes or is outlined in red via a CSS class toggled briefly |
| Input is only whitespace | Same as above — `text.trim()` is checked before creation |

### localStorage Failures

`localStorage` can throw in two situations: storage quota exceeded, or the browser is in a private/incognito mode with storage disabled.

```js
// _save() wraps writes in try/catch
_save() {
  try {
    localStorage.setItem('todos', JSON.stringify(this._todos));
  } catch (e) {
    console.warn('TodoStore: could not persist to localStorage.', e);
    // In-memory state is still valid; app continues to work for the session
  }
}

// _load() guards against corrupt JSON
_load() {
  try {
    const raw = localStorage.getItem('todos');
    this._todos = raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('TodoStore: corrupt localStorage data, resetting.', e);
    this._todos = [];
  }
}
```

**Behaviour:** If persistence fails, the app degrades gracefully — todos still work for the current session but won't survive a reload. No error is surfaced to the user unless a visible indicator is deliberately designed (out of scope for the MVP).

### Unknown / Missing `data-id`

Event delegation reads `data-id` from the DOM. If a click fires on an unexpected element without an ancestor `[data-id]`, `closest()` returns `null`. The handler guards:

```js
const item = event.target.closest('[data-id]');
if (!item) return; // ignore; not a todo action
```

### Defensive Rendering

`TodoRenderer.render()` always clears the list container before re-rendering. There is no incremental patch step that could leave stale nodes. If `todos` is an empty array, the list is simply left empty — no special empty-state error needed (though an "No todos yet" placeholder message is a reasonable UX addition).
