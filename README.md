# TestMind AI

An AI-powered QA automation assistant that helps you create E2E web tests, mobile tests, API tests, performance tests, and more — powered by Claude.

## Features

### Sauce Labs–style platform
- **Dashboard** — Live stats, recent runs, quick launch
- **Live cross-browser testing** — Start sessions with URL + browser/OS matrix; screenshot capture via Playwright
- **Automated runs** — Persisted run history with pass/fail counts and duration
- **Real device cloud** — Device catalog with reserve/release (Appium-ready)
- **CI/CD integrations** — GitHub Actions, Jenkins, CircleCI, GitLab, Azure pipeline templates
- **Parallel matrix** — Queue multi-browser runs via API
- **Local tunnel** — Config for staging apps (Sauce Connect–style via env)

### AI automation
- **Conversational test design** — Chat with the agent to define test scenarios
- **Test case generation** — Structured given/when/then test cases in JSON
- **Script generation** — Playwright, Appium/WebdriverIO, and Axios+Jest scripts with inline explanations
- **Test execution** — Run generated scripts with live terminal output via WebSocket
- **Reporting** — HTML reports, JSON/CSV export, Allure-compatible results, AI executive summaries, coverage heatmap, bug triage

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Database | SQLite via `better-sqlite3` |
| E2E | Playwright |
| Mobile | Appium + WebdriverIO |
| API | Axios + Jest |

## Setup

### Prerequisites

- Node.js 18+
- npm
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))

### Installation

```bash
cd testmind-ai

# Copy environment file and add your API key
cp .env.example .env

# Install all dependencies
npm run install:all
```

Edit `.env` and set your `ANTHROPIC_API_KEY`:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
PORT=3001
NODE_ENV=development
DB_PATH=./testmind.db
```

### Run Development Servers

```bash
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

## How to Use

1. Open http://localhost:5173
2. The agent greets you and asks what type of testing you need
3. Use quick-start buttons (E2E Web, Mobile, API, Performance) or type your requirements
4. Answer the agent's questions about your app, URLs, credentials, etc.
5. Review generated **test cases** in the right panel
6. Review the generated **automation script** with explanations
7. Click **Run Tests** to execute (requires Playwright/Appium installed locally)
8. View the **report dashboard** with bugs, charts, and AI summary

## Supported Test Types

| Type | Framework | Description |
|------|-----------|-------------|
| E2E Web | Playwright + TypeScript | Browser automation with Page Object Model |
| Mobile | Appium + WebdriverIO | iOS & Android native/hybrid apps |
| API | Axios + Jest | REST API status, schema, and error testing |
| Performance | Custom guidance | Load testing scenario design |
| Security | Custom guidance | Auth, input, header testing |
| Accessibility | Custom guidance | WCAG A/AA/AAA compliance |

## Example Agent Conversation

```
User: I want to create E2E tests for a login page

Agent: Great! I'll help you create comprehensive E2E tests. Let me ask a few questions:
1. What is the URL of the login page?
2. What browsers do you want to test? (Chrome, Firefox, Safari, Edge)
3. What are the login credentials format?
4. Are there any specific scenarios you want to cover? (wrong password, locked account, remember me, etc.)

User: URL is https://app.example.com/login, test Chrome and Firefox, credentials are email+password, cover: successful login, wrong password, empty fields, locked account

Agent: Perfect! Here are 6 test cases I've created... [shows test cases]
The Playwright TypeScript script is ready... [shows script with explanations]
```

## Project Structure

```
testmind-ai/
├── client/          # React frontend
├── server/          # Express API + Claude agent
├── test-outputs/    # Generated scripts & reports
├── .env.example
└── package.json     # npm workspaces root
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send message to agent |
| GET | `/api/testcases/:sessionId` | Get test cases |
| GET | `/api/scripts/:sessionId` | Get scripts |
| POST | `/api/runner/run` | Run a script |
| GET | `/api/reports/session/:sessionId` | Get reports |
| GET | `/api/platform/dashboard` | Dashboard stats + recent runs |
| GET | `/api/platform/capabilities` | Browser/device/CI catalog |
| POST | `/api/platform/live/start` | Start live session |
| GET | `/api/platform/ci/:provider` | CI pipeline template |
| WS | `ws://localhost:3001` | Test runner streaming |

## Viewing Reports

- **In-app**: Report dashboard in the right panel after test execution
- **HTML report**: Click "View Full HTML Report" (saved to `test-outputs/reports/`)
- **Export**: JSON or CSV download buttons in the report dashboard

## License

MIT
