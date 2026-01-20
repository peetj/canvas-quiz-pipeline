import dotenv from "dotenv";

dotenv.config();

function mustGet(name: string): string {
  const v = process.env[name];
  if (!v || v.trim().length === 0) throw new Error(`Missing env var: ${name}`);
  return v.trim();
}

function getOptional(name: string): string | undefined {
  const v = process.env[name];
  if (!v) return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

export const env = {
  canvasBaseUrl: mustGet("CANVAS_BASE_URL"),
  canvasApiToken: mustGet("CANVAS_API_TOKEN"),
  canvasTestCourseId: Number(mustGet("CANVAS_TEST_COURSE_ID")),
  quizAgentUrl: getOptional("QUIZ_AGENT_URL"),
  quizAgentApiKey: getOptional("QUIZ_AGENT_API_KEY")
};
