# Todo App

A simple, clean todo list web application built with **vanilla HTML, CSS, and
JavaScript** — no framework, no build step, no server required.

## Features

- Add, complete, and delete todos
- Todos persist across page reloads via `localStorage`
- Smooth entry animation and strikethrough transition for completed items
- Visual red-ring feedback when submitting empty input
- Graceful storage-full error message
- Accessible labels on all interactive elements

## Quick Start

Open `index.html` directly in any modern browser, **or** serve the project
locally for a proper module environment:

```bash
npx serve . -l 3000
# → http://localhost:3000
```

> **Note:** Because the JS files use ES modules (`<script type="module">`),
> some browsers block them when opened as `file://` URLs. Using a local server
> avoids that restriction.

## Development Setup

Node.js is only required for the dev toolchain (testing + linting). The app
itself has zero runtime dependencies.

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- npm (bundled with Node.js)

### Install dev dependencies

```bash
npm install
```

### Run the test suite

```bash
npm test               # single run
npm run test:watch     # watch mode — re-runs on file changes
npm run test:coverage  # with V8 coverage report
```

### Lint

```bash
npm run lint
```

## Project Structure

```
todo-app/
├── index.html                  # Single HTML entry point
├── css/
│   └── styles.css              # Custom styles (animations, transitions, error states)
├── js/
│   ├── app.js                  # Orchestrator: init + event wiring
│   ├── storage.js              # localStorage read / write (persistence boundary)
│   ├── todoManager.js          # Business logic and in-memory state
│   └── uiRenderer.js           # DOM construction and rendering (pure view)
├── tests/
│   ├── storage.test.js         # StorageService unit tests
│   ├── todoManager.test.js     # TodoManager unit tests
│   └── uiRenderer.test.js      # UIRenderer unit tests
├── docs/
│   ├── PRD.md                  # Product requirements
│   ├── ARCHITECTURE.md         # Architecture design document
│   └── BUILD_PLAN.md           # Sequential build tasks
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions: lint + test on every push / PR
├── eslint.config.js            # ESLint flat config (v9)
├── vitest.config.js            # Vitest configuration
└── package.json
```

## Architecture

The app follows a lightweight **MVC-inspired** pattern using plain ES6 modules:

| Layer | File | Responsibility |
|-------|------|----------------|
| **Model** | `storage.js` | `localStorage` read / write |
| **Controller** | `todoManager.js` | In-memory state, validation, sorting, persistence calls |
| **View** | `uiRenderer.js` | DOM construction — stateless, pure render |
| **Wiring** | `app.js` | Event listeners, bridges Controller and View |

Data flow for adding a todo:

```
User input → app.js → todoManager.addTodo()
                         ↓ validate & mutate
                         ↓ storage.save()
                         ↓ return sorted list
             app.js → uiRenderer.renderTodos()
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full design document
including architectural decision records (ADRs).

## Tech Stack

| Concern | Tool |
|---------|------|
| Markup | HTML5 |
| Styling | [Tailwind CSS](https://tailwindcss.com/) via CDN + custom CSS |
| Logic | Vanilla JavaScript (ES2022) |
| Persistence | `localStorage` |
| Testing | [Vitest](https://vitest.dev/) + [jsdom](https://github.com/jsdom/jsdom) |
| Linting | [ESLint](https://eslint.org/) v9 (flat config) |
| CI | GitHub Actions |
| Hosting | Any static host (GitHub Pages, Netlify, Vercel, etc.) |

## Deployment

No build step is required. Upload the following files to any static host:

```
index.html
css/styles.css
js/app.js
js/storage.js
js/todoManager.js
js/uiRenderer.js
```

## Browser Support

Requires a browser with ES module support (`<script type="module">`):
Chrome 61+, Firefox 60+, Safari 10.1+, Edge 16+.
