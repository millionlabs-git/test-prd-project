# Todo App

A minimal, dependency-free Todo application built with vanilla HTML, CSS, and JavaScript. No framework, no bundler — just static files you can open straight in a browser.

---

## Features

- Add, complete, and delete todos
- Todos sorted automatically: incomplete (newest first) → completed (newest first)
- Persisted in `localStorage` — survives page reloads
- Shake animation + red outline when submitting an empty todo
- Fade-in animation on new items
- Empty-state placeholder when the list is empty
- Graceful degradation if `localStorage` is unavailable or corrupt
- Respects `prefers-reduced-motion`

---

## Tech Stack

| Layer | Choice |
|---|---|
| Markup | HTML5 |
| Styling | [Tailwind CSS v3 via CDN](https://tailwindcss.com/docs/installation/play-cdn) + `styles.css` |
| Logic | Vanilla JavaScript (ES6+) |
| Persistence | `localStorage` |
| Testing | [Playwright](https://playwright.dev) E2E tests |

> **No build step.** The production app is `index.html` + `app.js` + `styles.css`.
> `package.json` exists only for the test toolchain.

---

## Project Structure

```
todo-app/
├── index.html               # App shell — markup, Tailwind CDN, script tag
├── app.js                   # TodoStore · TodoRenderer · TodoApp
├── styles.css               # Custom animations & error state styles
│
├── tests/
│   └── app.spec.js          # Playwright E2E tests (all acceptance criteria)
│
├── playwright.config.js     # Playwright configuration
├── package.json             # Dev dependencies (Playwright + serve)
│
├── .env.example             # Environment variable reference
├── .github/
│   └── workflows/
│       └── ci.yml           # GitHub Actions CI pipeline
│
└── docs/
    ├── PRD.md
    ├── ARCHITECTURE.md
    └── BUILD_PLAN.md
```

---

## Quick Start

### Open without any tooling

```bash
# Just open the file directly in your browser
open index.html       # macOS
xdg-open index.html   # Linux
# or drag-and-drop index.html into your browser
```

> **Note:** `crypto.randomUUID()` requires a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts).
> Opening via `file://` works in most modern browsers, but if you see UUID errors, use the local server below instead.

### Run with a local file server (recommended for testing)

```bash
# 1. Install dev dependencies (Playwright + serve)
npm install

# 2. Start the server
npm run serve
# → http://localhost:3000
```

---

## Running Tests

The test suite uses [Playwright](https://playwright.dev) and tests the app in real browsers (Chromium, Firefox, WebKit).

```bash
# Install npm dependencies
npm install

# Install Playwright browsers (first time only)
npx playwright install --with-deps

# Run all tests (headless)
npm test

# Run with Playwright's interactive UI
npm run test:ui

# Run tests in a headed browser (watch what's happening)
npm run test:headed

# Open the HTML test report from the last run
npm run test:report
```

### Running a specific browser or file

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test tests/app.spec.js
```

### Test coverage

| Area | Tests |
|---|---|
| Page layout & required DOM elements | ✅ |
| Empty-state placeholder | ✅ |
| Adding todos (button, Enter key, trim, sort) | ✅ |
| Input validation UX (error class, timing, consecutive) | ✅ |
| Toggle complete (strikethrough, sort, localStorage) | ✅ |
| Delete todo (DOM, reload, localStorage) | ✅ |
| Persistence across reloads | ✅ |
| Sort order (completed last, newest first within group) | ✅ |
| localStorage resilience (corrupt JSON, quota errors) | ✅ |

---

## CI

GitHub Actions runs on every push / PR to `main`:

| Job | What it does |
|---|---|
| `validate-html` | Checks `index.html` with `tidy` |
| `lint-js` | Parses `app.js` for syntax errors |
| `e2e (chromium)` | Full Playwright suite in Chrome |
| `e2e (firefox)` | Full Playwright suite in Firefox |
| `e2e (webkit)` | Full Playwright suite in Safari |

Playwright HTML reports and failure screenshots are uploaded as artifacts.

---

## Architecture Overview

```
index.html  ←──(DOM events)──►  TodoApp (controller)
                                    │
                          ┌─────────┴──────────┐
                          ▼                    ▼
                     TodoStore            TodoRenderer
                  (state + localStorage)  (DOM → #todo-list)
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full design.

---

## Data Model

```js
{
  id:        string,   // crypto.randomUUID()
  text:      string,   // trimmed user input
  completed: boolean,  // false = active
  createdAt: number    // Date.now()
}
```

Stored as JSON in `localStorage` under the key `"todos"`.

---

## Browser Support

Any modern browser with support for:
- `crypto.randomUUID()` (Chrome 92+, Firefox 95+, Safari 15.4+)
- `localStorage`
- ES6+ (arrow functions, destructuring, template literals, `const`/`let`)

---

## License

MIT
