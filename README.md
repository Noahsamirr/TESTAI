# QualityForge AI

The first truly unified, agent-native quality platform — one place to plan, generate, execute, self-heal, and report on every kind of test a modern software team needs.

## What's New in v2.0 (QualityForge AI)

| Was | Now |
|---|---|
| TestMind AI — single-layer AI test assistant | QualityForge AI — 9-layer unified quality platform |
| 6 nav sections | 10 nav sections across 3 grouped categories |
| Playwright + Appium + API | + Visual/A11y (axe-core) + Performance (k6) + Security (DAST+SCA) + AI Evals (LLM-as-judge) |
| Basic dashboard | QualityForge dashboard with module grid, pass-rate bar, quick-launch |
| `TestMind AI` system prompt | `QualityForge AI` prompt with 9 test-layer expertise |

---

## Features

### Core Platform
- **Dashboard** — Unified KPIs, pass-rate bar, module coverage grid, quick-launch shortcuts
- **Live Web Testing** — Cross-browser Playwright sessions with screenshot capture
- **Automated Runs** — Persisted run history, pass/fail counts, duration
- **Real Device Cloud** — Appium-ready device catalog with reserve/release
- **CI/CD Integrations** — GitHub Actions, Jenkins, CircleCI, GitLab, Azure Pipelines
- **AI Assistant** — Full-lifecycle chat: plan → generate → execute → report (Playwright, Appium, k6, Jest, Axios)

### Quality Modules (New in v2.0)
- **Visual & Accessibility** — Real [axe-core](https://github.com/dequelabs/axe-core) WCAG 2.2 scan via headless Playwright. Checks A, AA, AAA criteria. Returns violation cards with WCAG refs, HTML evidence, and remediation guidance. Multi-viewport support (Desktop 1920 → Mobile 390).
- **Performance & Load** — Real [k6](https://k6.io) load test runner. Configure VUs, duration, ramp-up, and P95/error-rate thresholds. Live log streaming via WebSocket. Auto-generates k6 JS scripts. Latency-over-time chart.
- **Security Testing** — Playwright-based DAST: security headers, HTTPS enforcement, XSS reflection probing, open-redirect detection, cookie flag audit. SCA via [retire.js](https://retirejs.github.io/retire.js/) for vulnerable npm dependencies. Findings with OWASP/CWE/SOC2/PCI compliance mapping.
- **AI Feature Testing** — LLM-as-judge evaluation via Claude. Four eval types: prompt-injection resistance, jailbreak resistance, factuality/hallucination, and custom quality grading. Pre-built templates, per-case score bars, model response + judge reasoning cards.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) |
| Database | SQLite via `better-sqlite3` |
| E2E / Visual | Playwright + Chromium |
| Accessibility | axe-core 4.10 (injected at runtime) |
| Performance | k6 (external binary — see install guide below) |
| Security DAST | Playwright headless browser active scanning |
| Security SCA | retire.js (bundled via npx) |
| AI Evals | Claude LLM-as-judge (dual-call: subject + judge) |
| Mobile | Appium + WebdriverIO |
| API | Axios + Jest |

---

## Dependencies Explained

### Always bundled (no extra install)
| Package | Used for |
|---|---|
| `@playwright/test` | Web E2E test execution |
| `playwright` | Headless browser for A11y scan + DAST |
| `@axe-core/playwright` | axe-core bindings for Playwright |
| `retire` | SCA scan for vulnerable npm packages |
| `@anthropic-ai/sdk` | Claude API for AI Assistant + AI Evals |

### External binary required
| Tool | Used for | Install |
|---|---|---|
| **k6** | Real load test execution | `brew install k6` (macOS) · `snap install k6` (Linux) · `choco install k6` (Windows) · [k6.io/docs](https://k6.io/docs/get-started/installation/) |

> The platform detects whether k6 is installed and shows a status indicator in the Performance view. All other modules work without it.

---

## Setup

### Prerequisites
- Node.js 18+
- npm
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))
- k6 (for Performance module only)
- Playwright browsers installed (`npx playwright install chromium`)

### Installation

```bash
cd testmind-ai

# Copy environment file and add your API key
cp .env.example .env

# Install all dependencies
npm run install:all

# Install Playwright browsers (required for Visual/A11y, Security, and Live Testing)
cd server && npx playwright install chromium && cd ..
```

Edit `.env`:

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

---

## API Endpoints

### Existing
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat` | AI Assistant chat |
| GET | `/api/testcases/:sessionId` | Get test cases |
| GET | `/api/scripts/:sessionId` | Get scripts |
| POST | `/api/runner/run` | Run a script |
| GET | `/api/reports/session/:sessionId` | Get reports |
| GET | `/api/platform/dashboard` | Dashboard stats |
| POST | `/api/platform/live/start` | Start live session |
| GET | `/api/platform/ci/:provider` | CI pipeline template |

### New in v2.0
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/visual/scan` | Real axe-core accessibility scan |
| GET | `/api/visual/viewports` | Viewport preset list |
| POST | `/api/performance/run` | Start k6 load test |
| POST | `/api/performance/generate-script` | Generate k6 script (no run) |
| GET | `/api/performance/check` | Check if k6 is installed |
| GET | `/api/performance/runs/:runnerId` | Get completed perf result |
| POST | `/api/security/scan` | DAST + SCA security scan |
| GET | `/api/security/findings/:scanId` | Get scan findings |
| GET | `/api/security/compliance-map` | OWASP/SOC2/PCI framework reference |
| POST | `/api/ai-evals/run` | Run LLM-as-judge eval suite |
| GET | `/api/ai-evals/templates` | Pre-built eval case templates |
| GET | `/api/ai-evals/eval-types` | Eval type reference |
| GET | `/api/health` | Platform health + module list |

---

## Platform Architecture

```
QualityForge AI
├── Orchestration Agent (Claude) ←→ AI Assistant view
│   ├── Web/E2E Agent    → Playwright runner
│   ├── Mobile Agent     → Appium/WebdriverIO
│   ├── API Agent        → Axios + Jest
│   ├── Visual Agent     → axe-core + Playwright (accessibilityScanner.ts)
│   ├── Perf Agent       → k6 binary (performanceRunner.ts)
│   ├── Security Agent   → Playwright DAST + retire.js (securityScanner.ts)
│   └── AI-Eval Agent    → LLM-as-judge via Claude (aiEvalsRunner.ts)
├── Execution Engine     → scriptRunner.ts (WebSocket streaming)
├── Reporting Service    → reportGenerator.ts (HTML + JSON + AI summary)
├── Platform Service     → platformService.ts (live sessions, device cloud)
└── Auth/Tenancy         → JWT + SQLite + subscription tiers
```

---

## License

MIT
