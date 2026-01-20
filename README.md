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

## Later
- Add agent integration: --prompt "..." will call the Cloudflare quiz agent.
