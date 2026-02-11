import { Command } from "commander";
import fs from "node:fs/promises";
import { env } from "./env.js";
import { validateNexgenQuiz } from "./quiz/schema/validate.js";
import { CanvasClient } from "./canvas/canvasClient.js";
import { mapToCanvasQuiz } from "./quiz/quizMapper.js";
import { generateQuizFromAgent } from "./agent/quiz/quizAgentClient.js";
import { buildSessionHeaderTitles, resolveModuleByName } from "./session/sessionHeaders.js";
import { buildTeacherNotesForSession } from "./session/teacherNotes.js";
import { loadConfig } from "./config.js";

const program = new Command();

program
  .name("nexgen-canvas")
  .description("Run Nexgen Canvas automation workflows.")
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

program.command("teacher-notes")
  .description("Generate canonical-style Teacher Notes from an existing session module and insert the page at the top.")
  .requiredOption("--session-name <name>", "Exact Canvas module name for the session")
  .requiredOption("--page-title <title>", "Canvas page title for the generated Teacher Notes")
  .option("--course-id <id>", "Canvas course id to use", String(env.canvasTestCourseId))
  .option("--draft", "Publish/update a draft notes page and leave live module placement unchanged", false)
  .option("--dry-run", "Generate and preview without uploading", false)
  .action(async (opts) => {
    const courseId = Number(opts.courseId);
    if (!Number.isFinite(courseId)) {
      throw new Error("Invalid --course-id. Provide a numeric Canvas course id.");
    }

    const sessionName = String(opts.sessionName);
    const rawPageTitle = String(opts.pageTitle);
    const isDraftMode = Boolean(opts.draft);
    const pageTitle = isDraftMode && !/\(draft\)\s*$/i.test(rawPageTitle)
      ? `${rawPageTitle} (Draft)`
      : rawPageTitle;
    const client = new CanvasClient();

    const built = await buildTeacherNotesForSession(client, courseId, sessionName, pageTitle);

    console.log(`Course: ${courseId}`);
    console.log(`Session module: ${built.module.name} (${built.module.id})`);
    console.log(`Mode: ${isDraftMode ? "draft" : "live"}`);
    console.log(`Source pages: ${built.modulePages.length}`);
    console.log(`Teacher notes title: ${pageTitle}`);
    console.log(`Target module position: ${built.insertionPosition}`);

    if (opts.dryRun) {
      console.log("Dry run: no Canvas updates performed.");
      console.log("Generated HTML preview:");
      console.log(built.notesHtml.split("\n").slice(0, 40).join("\n"));
      return;
    }

    const normalize = (v: string): string => v.trim().toLowerCase();
    const archivePage = async (pageUrl: string): Promise<string | undefined> => {
      const current = await client.getPage(courseId, pageUrl);
      const stamp = new Date().toISOString().replace(/[.:]/g, "-");
      const archiveTitle = `${current.title} (Archive ${stamp})`;
      const archived = await client.createPage(courseId, {
        title: archiveTitle,
        body: current.body ?? "",
        published: false
      });
      return archived.title;
    };
    const existingModulePage = built.moduleItems.find(
      (item) => item.type === "Page" && normalize(item.title) === normalize(pageTitle) && !!item.page_url
    );

    let pageUrl: string;
    let createdPage = false;
    let createdModuleItem = false;
    let movedModuleItem = false;

    if (existingModulePage?.page_url) {
      pageUrl = existingModulePage.page_url;
      const archivedTitle = isDraftMode ? undefined : await archivePage(pageUrl);
      await client.updatePage(courseId, pageUrl, {
        title: pageTitle,
        body: built.notesHtml,
        published: true
      });
      if (archivedTitle) {
        console.log(`Archived previous page content: ${archivedTitle}`);
      }
    } else {
      const pages = await client.listPages(courseId, pageTitle);
      const existingPage = pages.find((page) => normalize(page.title) === normalize(pageTitle));

      if (existingPage) {
        pageUrl = existingPage.url;
        const archivedTitle = isDraftMode ? undefined : await archivePage(pageUrl);
        await client.updatePage(courseId, pageUrl, {
          title: pageTitle,
          body: built.notesHtml,
          published: true
        });
        if (archivedTitle) {
          console.log(`Archived previous page content: ${archivedTitle}`);
        }
      } else {
        const created = await client.createPage(courseId, {
          title: pageTitle,
          body: built.notesHtml,
          published: true
        });
        pageUrl = created.url;
        createdPage = true;
      }
    }

    if (!isDraftMode) {
      const moduleItemForPage = built.moduleItems.find(
        (item) => item.type === "Page" && item.page_url === pageUrl
      );

      if (!moduleItemForPage) {
        await client.createModulePageItem(courseId, built.module.id, {
          title: pageTitle,
          pageUrl,
          position: built.insertionPosition
        });
        createdModuleItem = true;
      } else if (moduleItemForPage.position !== built.insertionPosition) {
        await client.updateModuleItemPosition(
          courseId,
          built.module.id,
          moduleItemForPage.id,
          built.insertionPosition
        );
        movedModuleItem = true;
      }
    }

    console.log(createdPage ? "Created page." : "Updated existing page.");
    if (isDraftMode) {
      console.log("Draft mode: module placement unchanged.");
    } else {
      if (createdModuleItem) console.log("Added page to session module.");
      if (movedModuleItem) console.log("Moved module item to top of session.");
      if (!createdModuleItem && !movedModuleItem) console.log("Module item placement already correct.");
    }
    console.log(`Page URL: ${env.canvasBaseUrl}/courses/${courseId}/pages/${pageUrl}`);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
