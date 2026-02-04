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

  async updateQuiz(courseId: number, quizId: number, quiz: { published?: boolean }): Promise<{ id: number; published?: boolean; question_count?: number }> {
    return this.request({
      method: "PUT",
      path: `/api/v1/courses/${courseId}/quizzes/${quizId}`,
      body: { quiz }
    });
  }

  async listModules(courseId: number, searchTerm?: string): Promise<Array<{ id: number; name: string }>> {
    const params = new URLSearchParams({ per_page: "100" });
    if (searchTerm && searchTerm.trim().length > 0) {
      params.set("search_term", searchTerm.trim());
    }
    return this.request({
      method: "GET",
      path: `/api/v1/courses/${courseId}/modules?${params.toString()}`
    });
  }

  async createModuleSubHeader(
    courseId: number,
    moduleId: number,
    title: string
  ): Promise<{ id: number; title: string }> {
    return this.request({
      method: "POST",
      path: `/api/v1/courses/${courseId}/modules/${moduleId}/items`,
      body: {
        module_item: {
          title,
          type: "SubHeader"
        }
      }
    });
  }
}
