# ⚡ AGENTS.md — Automated Coursework Journal System Directives

> **CRITICAL SYSTEM MANDATE:**
> Every AI agent operating in this repository MUST follow the guidelines, architecture, security directives, and diagnostic workflows defined in this document without exception.

---

## 🏛️ Project Overview & Architecture

**Automated Coursework Journal Submission** is an enterprise-grade Node.js & Playwright automation system that auto-summarizes daily GitHub commit activity for a specific user/repository and submits the entry to Google Forms using an authenticated Google session (`storageState.json`).

- **Engine**: Node.js v20+ (ES Modules)
- **Browser Automation**: Playwright Chromium with persistent session state restoration
- **Commit Fetcher**: GitHub REST API (`/repos/{owner}/{repo}/commits?since=...`)
- **CI/CD Automation**: Scheduled GitHub Actions workflow (`.github/workflows/daily-journal.yml`)
- **Testing Engine**: Built-in Node.js Test Runner (`node --test`)

---

## 🔒 Security & Privacy Directives

1. **Session State Isolation**: `storageState.json` contains active Google session authentication cookies and MUST NEVER be committed to Git. Enforced via `.gitignore`.
2. **Secrets Management**: Credentials and session state are base64-encoded and injected via GitHub Repository Secrets (`STORAGE_STATE_BASE64`).
3. **Fail-Fast Error Strategy**: Non-zero exit code (`exit 1`) on any failure (expired session, missing form fields, network failure, missing binaries) to immediately alert maintainers via GitHub Actions notifications.
4. **Environment Masking**: Never expose personal access tokens (`GH_TOKEN`, `COMMIT_READ_TOKEN`) or pre-filled session tokens in logs or public documentation.

---

## 📁 Repository Structure & File Responsibilities

```
.
├── .github/workflows/
│   └── daily-journal.yml     # Scheduled daily GitHub Actions workflow (Mon-Fri 10:30 UTC / 4:00 PM IST)
├── scripts/
│   ├── login.js              # One-time interactive Google authentication & field extractor script
│   └── diagnose-form.js      # Diagnostic script for inspecting form DOM elements & checkboxes
├── src/
│   ├── config.js             # Environment & configuration loader, dry-run & map parser
│   ├── summarizer.js         # GitHub REST API commit fetcher & timezone midnight calculation
│   ├── urlBuilder.js         # Pre-filled Google Form URL constructor & parameter encoder
│   └── submit.js             # Headless Playwright runner, form filler & Sunday check
├── test/
│   └── check.js              # Native Node.js unit test runner checks (node --test)
├── .env.example              # Template environment file
├── .gitignore                # Git exclusions (node_modules, .env, storageState.json, screenshots)
├── package.json              # Project manifest, dependencies, and script definitions
├── LICENSE                   # Open-source MIT License
├── README.md                 # Public setup, pre-filled link guide & secrets storage documentation
└── AGENTS.md                 # System architecture directives & agent rules (This file)
```

---

## 🧩 Detailed Module Specifications

### 1. `src/config.js` — Configuration & Environment Engine
- **Purpose**: Loads `.env`, parses environment variables, and exports central configuration.
- **Key Logic**:
  - `DEFAULT_FORM_ID`: Standard default Google Form identifier.
  - `DEFAULT_ANSWERS`: Pre-configured dictionary of standard coursework responses (`entry.187493348`, `entry.32162408`, etc.).
  - `parseEntryMap()`: Parses `process.env.ENTRY_MAP` JSON string safely with full type checks (`typeof === 'object'`, `!Array.isArray`).
  - `dryRun`: Evaluates flags (`DRY_RUN`, `DISABLE_SUBMIT`, `--dry-run`, `--disable-submit`) into a boolean.

### 2. `src/urlBuilder.js` — Pre-filled URL Constructor
- **Purpose**: Generates pre-populated Google Form URLs with encoded `entry.XXXXX` parameters.
- **Key Logic**:
  - `buildPrefilledUrl({ formId, entryMap, journalSummaryText })`: Extracts clean form ID from raw URLs, validates inputs, handles string/object maps, maps `JOURNAL_TEXT` placeholders, and encodes query strings.

### 3. `src/summarizer.js` — Activity Summarizer & Timezone Engine
- **Purpose**: Calculates target timezone midnight ISO timestamps and queries the GitHub REST API for daily commit activity.
- **Key Logic**:
  - `getMidnightISO(timezone, date)`: Computes exact UTC ISO string for midnight (00:00:00) of the current day in target timezone (`Asia/Kolkata` default).
  - `getFormattedToday(timezone, date)`: Formats date as `YYYY-MM-DD`.
  - `generateCommitSummary(opts)`: Fetches commits from GitHub API, extracts unique first-line messages, or gracefully returns default summary text if unconfigured/offline.

### 4. `src/submit.js` — Playwright Automation Engine
- **Purpose**: Main execution entrypoint for headless browser form interaction with anti-detection and state write-back.
- **Key Logic**:
  - `persistStorageState(context, targetPath)`: Exports refreshed browser context cookies/localStorage back to disk after navigation, ensuring Google's rotating tokens (`__Secure-1PSIDRTS`, `S`) are preserved for future runs.
  - `--keepalive` Mode: Validates the Google session, allows background rotating tokens to settle, saves the renewed session state to disk, and exits without submitting the form. Used by weekend scheduled workflows.
  - Anti-Detection Configuration: Disables `AutomationControlled` blink features, masks `navigator.webdriver`, configures realistic desktop User-Agent, viewport (1280x800), and IST timezone emulation to prevent datacenter IP bot-flagging.
  - `isSunday(timezone, date)`: Returns `true` if current day is Sunday in target timezone to skip weekend submissions cleanly (`exit 0`), unless `--keepalive` is specified.
  - `fillCurrentPage()`: Automatically dismisses "Continue draft" modals, checks mandatory email consent checkboxes, selects working day radio options, and fills empty text inputs/textareas.
  - Page Loop: Iterates through multi-section forms by locating `Next` and `Submit` buttons, saving progress screenshots to `screenshots/`.
  - Dry Run Handling: Logs form validation success without triggering the final submit click when dry-run mode is active, while still persisting refreshed cookies.

### 5. `scripts/login.js` & `scripts/diagnose-form.js` — Utility Tools
- **`login.js`**: Interactive authentication CLI tool that launches visible Chromium, waits for Google sign-in, inspects form field names, and writes `storageState.json`.
- **`diagnose-form.js`**: Diagnostic DOM inspection script used to analyze Google Form checkbox ARIA roles and DOM trees when form layouts shift.

---

## 🛠️ Operational & Diagnostic Workflows

### 1. Handling Expired Google Sessions
If CI/CD or local submission fails with `Authentication failed! redirected to Google sign-in page`:
1. Execute `npm run login` locally.
2. Complete Google authentication in the spawned browser window.
3. Press **[ENTER]** in terminal to generate a fresh `storageState.json`.
4. Re-encode `storageState.json` to base64 (`base64 -w 0 storageState.json`) and update the `STORAGE_STATE_BASE64` secret in GitHub Repository Settings.

### 2. Form Layout / DOM Selector Drift
Google Forms periodically updates UI class names. If navigation fails:
1. Run `node scripts/diagnose-form.js` to dump current form HTML and inspect ARIA locators.
2. Update selector strategies in `src/submit.js` maintaining multi-tier ARIA/role fallbacks (e.g. `getByRole('button')` combined with `locator('div[role="button"]')`).

### 3. Testing Directives
Agents modifying core logic MUST run `npm test` before committing changes. All unit tests in `test/check.js` must pass with zero errors.

---

## 📜 Compliance Mandate

All AI agents must ensure code changes remain ES Module compatible, adhere to strict error-handling practices, and maintain clear separation between secrets and codebase files.
