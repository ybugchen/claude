Purpose
-------
This file guides AI coding agents working in this repository. It summarizes the repository state, quick discovery steps, and project-specific conventions or placeholders the agent should follow.

Repository snapshot
-------------------
- **Project**: Todo List Demo Application
- **Language**: JavaScript (Node.js)
- **Framework**: Express.js
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Testing**: Jest + Supertest
- **Package Manager**: npm

Agent priorities
----------------
- Start by locating key manifests: `package.json`, `pyproject.toml`, `requirements.txt`, `go.mod`, `Cargo.toml`, `composer.json`.
- If none exist, look for common top-level folders: `src/`, `app/`, `cmd/`, `web/`, `services/`, `api/`, `tests/`, `.github/workflows/`, `Dockerfile`.

Discovery commands (run before editing)
-------------------------------------
- List files: `git ls-files --others --exclude-standard --cached` and `ls -la`.
- Fast search for docs/rules: `rg "copilot-instructions|AGENT|AGENTS|CLAUDE|.cursorrules|.windsurfrules|.clinerules|README" -S || true`.
- Find build/test commands: inspect `Makefile`, `.github/workflows/*.yml`, `package.json` scripts.

When you find code: what to extract
-----------------------------------
- Architecture: locate the service entry points (e.g., `src/main.*`, `cmd/`, `server/`), API handlers (`api/`, `routes/`), and persistence layers (`models/`, `db/`).
- Data flow: identify DTOs, request/response shapes, and where serialization happens (controllers, handlers, serializers).
- Integration points: note external services (env vars, `config/*.example`, `secrets`, third-party SDKs in `package.json` or `requirements.txt`).

Project-specific conventions (how to record findings)
----------------------------------------------------
- Call out exact file paths found (use repository-relative links in PR descriptions).
- If you change code, include minimal, focused edits and run the project's test command if present (see `Makefile`, `package.json` `test` script, or `pytest` invocation).
- Use the repository's formatting/linting tools when present (`prettier`, `black`, `go fmt`, `rustfmt`).

If tests or CI exist
--------------------
- Run the same commands CI uses: inspect `.github/workflows/*` for the exact steps and reproduce them locally.

Project Architecture
--------------------
- **Backend Entry Point**: `src/server.js` (Express server)
- **API Routes**: `src/routes/todos.js` (RESTful endpoints for todos)
- **Data Layer**: `src/data/store.js` (in-memory storage)
- **Frontend**: `public/` directory
  - `index.html` - Main HTML page
  - `styles.css` - Styling
  - `app.js` - Frontend JavaScript logic
- **Tests**: `__tests__/server.test.js` (API integration tests)
- **Config Files**:
  - `package.json` - npm scripts and dependencies
  - `jest.config.js` - Test configuration
  - `.eslintrc.json` - Linting rules

Development Commands
--------------------
- Install dependencies: `npm install`
- Start development server: `npm run dev` (uses nodemon)
- Start production server: `npm start`
- Run tests: `npm test`
- Run tests with coverage: `npm test -- --coverage`
- Lint code: `npm run lint`

API Endpoints
-------------
- `GET /api/todos` - Get all todos
- `GET /api/todos/:id` - Get todo by ID
- `POST /api/todos` - Create new todo (body: `{ title }`)
- `PUT /api/todos/:id` - Update todo (body: `{ title?, completed? }`)
- `DELETE /api/todos/:id` - Delete todo
- `GET /api/health` - Health check endpoint

When in doubt
-------------
- Ask the repo owner for the preferred local dev commands or a short README snippet.
- Prefer minimal, reversible changes and open a draft PR with explanations.

Notes for AI Agents
--------------------
- This is a complete, working demo application
- Before making changes, run the tests to ensure everything works: `npm test`
- Use ESLint for code quality: `npm run lint`
- The data store is in-memory, so all data resets when the server restarts
- Frontend uses vanilla JavaScript (no build step required)
- Follow the existing code style and patterns when making changes

Feedback
--------
If anything here is unclear or missing, tell me what language/framework this repo uses and I'll update this file with specific commands and examples.
