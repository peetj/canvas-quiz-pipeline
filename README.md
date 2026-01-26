# Nexgen Canvas Quiz Pipeline

This repo generates and uploads Nexgen-style multiple choice quizzes into Canvas using the Canvas API.

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

## Later
- Add agent integration: --prompt "..." will call the Cloudflare quiz agent.

## Creating and Uploading the Repository to Github
git init
git status
git add -A
git commit -m "Fix schema validation and JSON import"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/REPO_NAME.git
git push -u origin main


If you need to login to your repo (assuming you have the github cli installed)

gh auth login
