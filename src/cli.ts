import { Command } from "commander";
import fs from "node:fs/promises";
import { env } from "./env.js";
import { validateNexgenQuiz } from "./quiz/schema/validate.js";
import { CanvasClient } from "./canvas/canvasClient.js";
import { mapToCanvasQuiz } from "./quiz/quizMapper.js";
import { generateQuizFromAgent } from "./agent/quiz/quizAgentClient.js";
import { buildSessionHeaderTitles, resolveModuleByName } from "./session/sessionHeaders.js";
import { loadConfig } from "./config.js";

const program = new Command();

program
  .name("nexgen-quiz")
  .description("Generate Nexgen quizzes and upload to Canvas.")
  .version("0.1.0");

program.command("create")
  .description("Create a quiz in Canvas from a JSON file or from an agent prompt.")
  .option("--course-id <id>", "Canvas course id to upload to", String(env.canvasTestCourseId))
  .option("--from-file <path>", "Load Nexgen quiz JSON from file")
  .option("--prompt <text>", "Generate quiz from agent using a prompt")
  .option("--dry-run", "Validate and show a summary without uploading", false)
  .action(async (opts) => {
    const courseId = Number(opts.courseId);

    if (!opts.fromFile && !opts.prompt) {
      throw new Error("Provide either --from-file or --prompt.");
    }
    if (opts.fromFile && opts.prompt) {
      throw new Error("Provide only one of --from-file or --prompt.");
    }

    let raw: unknown;

    if (opts.fromFile) {
      const txt = await fs.readFile(String(opts.fromFile), "utf8");
      raw = JSON.parse(txt);
    } else {
      raw = await generateQuizFromAgent(String(opts.prompt));
    }

    const quiz = validateNexgenQuiz(raw);
    const mapped = mapToCanvasQuiz(quiz);

    console.log(`Quiz: ${quiz.title}`);
    console.log(`Questions: ${quiz.questions.length} (expected 5)`);
    console.log(`Target course: ${courseId}`);
    if (opts.dryRun) {
      console.log("Dry run: no upload performed.");
      return;
    }

    const client = new CanvasClient();
    const created = await client.createQuiz(courseId, mapped.canvasQuiz);

    for (const q of mapped.canvasQuestions) {
      await client.addQuizQuestion(courseId, created.id, q);
    }

    if (mapped.canvasQuiz.published === false) {
      try {
        await client.updateQuiz(courseId, created.id, { published: true });
        await client.updateQuiz(courseId, created.id, { published: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`Warning: unable to refresh quiz question count. You can publish/unpublish manually. ${message}`);
      }
    }

    const urlGuess = created.html_url ?? `${env.canvasBaseUrl}/courses/${courseId}/quizzes/${created.id}`;
    console.log(`Created quiz id: ${created.id}`);
    console.log(`Quiz URL: ${urlGuess}`);
  });

program.command("session-headers")
  .description("Create session text headers inside an existing Canvas module.")
  .requiredOption("--module-name <name>", "Canvas module name to add headers to")
  .requiredOption("--session <number>", "Session number (e.g. 1 for Session 01)")
  .option("--course-id <id>", "Canvas course id to use", String(env.canvasTestCourseId))
  .option("--dry-run", "Show headers without creating them", false)
  .action(async (opts) => {
    const courseId = Number(opts.courseId);
    if (!Number.isFinite(courseId)) {
      throw new Error("Invalid --course-id. Provide a numeric Canvas course id.");
    }

    const sessionNumber = Number(opts.session);
    const config = await loadConfig();
    const headers = buildSessionHeaderTitles(sessionNumber, config.sessions);
    const moduleName = String(opts.moduleName);

    const client = new CanvasClient();
    const module = await resolveModuleByName(client, courseId, moduleName);

    console.log(`Module: ${module.name} (${module.id})`);
    console.log(`Session: ${String(sessionNumber).padStart(2, "0")}`);
    console.log("Headers:");
    for (const title of headers) {
      console.log(`- ${title}`);
    }

    if (opts.dryRun) {
      console.log("Dry run: no module items created.");
      return;
    }

    for (const title of headers) {
      await client.createModuleSubHeader(courseId, module.id, title);
    }

    console.log("Session headers created.");
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
