# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Install dependencies**: `npm install`
- **Start dev server** (with hot reload): `npm run dev` — runs on http://localhost:3000
- **Start production server**: `npm start`
- **Run tests with coverage**: `npm test`
- **Run a single test file**: `npx jest __tests__/server.test.js`
- **Run a single test by name**: `npx jest -t "should create a new todo"`
- **Lint**: `npm run lint`

## Architecture

Express.js backend serving a vanilla JS frontend as static files. All state is in-memory (resets on restart).

- **Entry point**: `src/server.js` — Express app setup, middleware (CORS, JSON parsing), static file serving from `public/`, route mounting
- **API routes**: `src/routes/todos.js` — RESTful CRUD endpoints under `/api/todos`, includes priority validation (low/medium/high)
- **Data store**: `src/data/store.js` — in-memory array with getAll/getById/create/update/delete/reset methods. `create()` accepts title and priority params
- **Frontend**: `public/` — single-page app with `index.html`, `styles.css`, `app.js`. Uses fetch API to call backend. No build step
- **Tests**: `__tests__/server.test.js` — integration tests using supertest against the Express app (not a running server). Store is reset via `store.reset()` in beforeEach

## Key patterns

- The Express app is exported as a module (not just started as a server) so supertest can import it directly for testing
- Todo items have: id, title, completed, priority, createdAt, updatedAt
- Priority values are validated as enum: `low`, `medium`, `high` (default: `medium`)
- Frontend escapes HTML via DOM textContent to prevent XSS
