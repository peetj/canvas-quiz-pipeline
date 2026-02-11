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
- `config/nexgen-canvas-pipeline.config.json`: central config for quiz/session defaults
- `src/quiz`: quiz automation logic (schema validation, mapping, and CLI wiring)
- `src/session`: session setup automation (module headers)
- `src/agent/quiz`: quiz agent client used by the CLI
- `agent/src/quiz`: Cloudflare quiz agent worker

## Try it (dry run from example JSON)
npm run dev -- create --from-file examples/nexgen-quiz.example.json --dry-run

## Upload the example JSON to Canvas
npm run dev -- create --from-file examples/nexgen-quiz.example.json

## Generate a quiz via agent and upload to Canvas
1. Set `QUIZ_AGENT_URL` in `.env` (and `QUIZ_AGENT_API_KEY` if required).
2. Run the CLI with `--prompt`:
   npm run dev -- create --prompt "Year 9 chemistry: acids and bases" --course-id 12345
3. Optional dry run (no upload):
   npm run dev -- create --prompt "Year 9 chemistry: acids and bases" --course-id 12345 --dry-run

## Create session headers in an existing module
Create the standard set of text headers for a specific session number in a module.

npm run dev -- session-headers --course-id 12345 --module-name "Term 1 - Module" --session 1

Optional dry run (no upload):
npm run dev -- session-headers --course-id 12345 --module-name "Term 1 - Module" --session 1 --dry-run

## Config
All non-secret settings live in `config/nexgen-canvas-pipeline.config.json`. For session headers, edit
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
