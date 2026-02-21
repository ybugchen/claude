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

## Project structure

```
├── src/                    # Backend source code
│   ├── server.js           # Express app entry point (middleware, static serving, route mounting)
│   ├── routes/
│   │   └── todos.js        # RESTful CRUD endpoints for /api/todos
│   └── data/
│       └── store.js        # In-memory data store (getAll/getById/create/update/delete/reset)
├── public/                 # Frontend static files (served by Express)
│   ├── index.html          # Main HTML page
│   ├── styles.css          # Styles (responsive, priority badge colors)
│   └── app.js              # Frontend logic (fetch API calls, DOM rendering)
├── __tests__/
│   └── server.test.js      # Integration tests (supertest against Express app)
├── .github/
│   └── copilot-instructions.md  # AI agent guidance
├── package.json            # Dependencies and npm scripts
├── jest.config.js          # Jest test configuration
└── .eslintrc.json          # ESLint rules
```

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

## Hooks

Claude Code hooks are configured in `.github/hooks/hooks.json`. They run shell commands automatically on specific events.

### Available events

| Event | Trigger | Use case |
|---|---|---|
| `PreToolUse` | Before a tool executes | Block or validate tool calls (e.g., run tests before `git commit`) |
| `PostToolUse` | After a tool executes | Post-processing (e.g., lint after file edits) |
| `Notification` | When a notification fires | Custom alerts |
| `Stop` | When the agent stops | Cleanup tasks |
| `SubagentStop` | When a subagent stops | Subagent cleanup |

### Hook format

```json
{
  "hooks": {
    "<Event>": [
      {
        "matcher": "<ToolName>",
        "type": "command",
        "command": "<shell command>"
      }
    ]
  }
}
```

- `matcher` (optional): Tool name to match (e.g., `Bash`, `Edit`, `Write`). Only for `PreToolUse`/`PostToolUse`
- `type`: Always `"command"`
- `command`: Shell command to run. Exit code non-zero blocks the action (for `PreToolUse`)
- Environment variable `$TOOL_INPUT` contains the tool's input as JSON

### Current hooks in this project

- **Pre-commit test gate**: Before any `git commit`, automatically runs `npm test`. If tests fail, the commit is blocked

### Guidelines for adding hooks

- Keep hooks fast — slow hooks degrade the development experience
- Always run `npm test` before commits to prevent broken code from being committed
- Use `matcher` to scope hooks narrowly (e.g., only `Bash` tool, not all tools)
- Test hook commands manually before adding them to `hooks.json`
