import { env } from "../env.js";

type FetchOptions = {
  method?: string;
  path: string;
  body?: unknown;
};

export class CanvasClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl = env.canvasBaseUrl, token = env.canvasApiToken) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.token = token;
  }

  private async request<T>(opts: FetchOptions): Promise<T> {
    const url = `${this.baseUrl}${opts.path}`;
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: {
        "Authorization": `Bearer ${this.token}`,
        "Content-Type": "application/json"
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Canvas API error ${res.status} ${res.statusText} for ${opts.method ?? "GET"} ${opts.path}\n${text}`);
    }

    return (await res.json()) as T;
  }

  async createQuiz(courseId: number, quiz: {
    title: string;
    description?: string;
    published?: boolean;
    time_limit?: number;
    allowed_attempts?: number;
  }): Promise<{ id: number; html_url?: string; title: string }> {
    return this.request({
      method: "POST",
      path: `/api/v1/courses/${courseId}/quizzes`,
      body: { quiz: { quiz_type: "assignment", ...quiz } }
    });
  }

  async addQuizQuestion(courseId: number, quizId: number, question: unknown): Promise<{ id: number }> {
    return this.request({
      method: "POST",
      path: `/api/v1/courses/${courseId}/quizzes/${quizId}/questions`,
      body: { question }
    });
  }
}
