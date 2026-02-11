# Nexgen Canvas Pipeline

This repo hosts Canvas automations. It currently generates and uploads Nexgen-style multiple choice quizzes into Canvas using the Canvas API.

## Goals (v1)
- Validate quiz JSON using a locked schema (nexgen-quiz.v1)
- Create a Classic Quiz in the Nexgen Test course
- Add 5 multiple choice questions, 4 options each
- Support a --dry-run mode

## Setup
1. Install Node.js 18+.
2. Copy .env.example to .env and fill values.
3. Install deps:
   npm install

## Repo layout
- `apps/cli`: Canvas automation CLI app (quiz/session/teacher-notes commands)
- `apps/cli/config/nexgen-canvas-pipeline.config.json`: CLI config defaults
- `apps/cli/examples`: example quiz payloads
- `packages/canvas-sdk`: shared Canvas API client and types
- `agent/src/quiz`: Cloudflare quiz agent worker

## Config
All non-secret settings live in `apps/cli/config/nexgen-canvas-pipeline.config.json`. For session headers, edit
`sessions.headersTemplate`. Use `{nn}` for a zero-padded session number (e.g. 01) and `{n}` for
the raw session number (e.g. 1).

## Later
- Add agent integration: --prompt "..." will call the Cloudflare quiz agent.

## Creating and Uploading the Repository to Github
git init
git status
git add -A
git commit -m "Fix schema validation and JSON import"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/nexgen-canvas-pipeline.git
git push -u origin main


If you need to login to your repo (assuming you have the github cli installed)

gh auth login

## Usage
Use either invocation style:

1. Direct (most reliable across shells):
`npx tsx apps/cli/src/cli.ts <command> [options]`
Run once before direct mode (or whenever `packages/canvas-sdk/src` changes):
`npm run -w @nexgen/canvas-sdk build`
2. npm script wrapper:
`npm run dev -- <command> -- [options]`

### Command: `create`
Create a quiz in Canvas from a JSON file or from an agent prompt.

Options:
- `--course-id <id>`: Canvas course id. Default: `CANVAS_TEST_COURSE_ID` from `.env`.
- `--from-file <path>`: Path to Nexgen quiz JSON input.
- `--prompt <text>`: Prompt used to generate quiz content via quiz agent.
- `--dry-run`: Validate/show summary only; no Canvas upload.

Rules:
- Provide exactly one of `--from-file` or `--prompt`.

Examples:
```bash
npx tsx apps/cli/src/cli.ts create --from-file apps/cli/examples/nexgen-quiz.example.json --dry-run
npx tsx apps/cli/src/cli.ts create --from-file apps/cli/examples/nexgen-quiz.example.json
npx tsx apps/cli/src/cli.ts create --prompt "Year 9 chemistry: acids and bases" --course-id 12345 --dry-run

# npm wrapper form
npm run dev -- create -- --from-file apps/cli/examples/nexgen-quiz.example.json --dry-run
```

### Command: `session-headers`
Create standard session subheaders inside an existing module.

Options:
- `--module-name <name>`: Required. Exact Canvas module name.
- `--session <number>`: Required. Session number (for example, `1` for Session 01).
- `--course-id <id>`: Canvas course id. Default: `CANVAS_TEST_COURSE_ID` from `.env`.
- `--dry-run`: Preview headers only; no module updates.

Example:
```bash
npx tsx apps/cli/src/cli.ts session-headers --course-id 12345 --module-name "Term 1 - Module" --session 1 --dry-run

# npm wrapper form
npm run dev -- session-headers -- --course-id 12345 --module-name "Term 1 - Module" --session 1 --dry-run
```

### Command: `teacher-notes`
Generate teacher notes from existing session content.

Options:
- `--session-name <name>`: Required. Exact Canvas module name for the session.
- `--page-title <title>`: Required. Base title for teacher notes page.
- `--course-id <id>`: Canvas course id. Default: `CANVAS_TEST_COURSE_ID` from `.env`.
- `--draft`: Write/update draft notes page (`<page-title> (Draft)`), keep live module placement unchanged.
- `--dry-run`: Generate preview only; no Canvas updates.

Live mode behavior (default, when `--draft` is not set):
- Archives existing target page before overwrite.
- Creates or updates teacher notes page.
- Inserts/moves page to top of session module under `Teachers Notes`.

Draft mode behavior:
- Creates/updates draft page only.
- Does not archive live page.
- Does not change live module placement.

Examples:
```bash
# Draft iteration
npx tsx apps/cli/src/cli.ts teacher-notes --course-id 21 --session-name "Session 03 - The LCD Screen & 3x4 Matrix Keypad" --page-title "The LCD Screen & 3x4 Matrix Keypad" --draft

# Draft preview only
npx tsx apps/cli/src/cli.ts teacher-notes --course-id 21 --session-name "Session 03 - The LCD Screen & 3x4 Matrix Keypad" --page-title "The LCD Screen & 3x4 Matrix Keypad" --draft --dry-run

# Live publish (after draft approval)
npx tsx apps/cli/src/cli.ts teacher-notes --course-id 21 --session-name "Session 03 - The LCD Screen & 3x4 Matrix Keypad" --page-title "The LCD Screen & 3x4 Matrix Keypad"

# npm wrapper form
npm run dev -- teacher-notes -- --course-id 21 --session-name "Session 03 - The LCD Screen & 3x4 Matrix Keypad" --page-title "The LCD Screen & 3x4 Matrix Keypad" --draft --dry-run
```
