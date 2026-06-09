import { ServiceBase } from "./baseService";
import type { ThreadProblem, CreateThreadResponse, ThreadResponse } from "@/features/whywhy/types";

/**
 * Request payload for creating a new thread
 */
interface CreateThreadRequest {
  problem: ThreadProblem;
  parent_id?: string;
}

/**
 * Request payload for streaming analysis
 */
interface StreamAnalysisRequest {
  user_message?: string;
  is_retry?: boolean;
}

class WhyWhyApiClient extends ServiceBase {
  private inflightGetThread: Map<string, Promise<{ data: { data: ThreadResponse } }>> = new Map();

  /**
   * POST /api/v1/threads - Create a new thread
   */
  createThread = async (
    problem: ThreadProblem & { parent_id?: string },
  ): Promise<{ data: { data: CreateThreadResponse } }> => {
    // Extract parent_id from problem if it exists
    const { parent_id, ...problemData } = problem;
    const payload: CreateThreadRequest = { problem: problemData };

    // Add parent_id to payload if it exists
    if (parent_id) {
      payload.parent_id = parent_id;
    }

    return this.post("/threads", payload);
  };

  /**
   * GET /api/v1/threads - Get list of user's threads
   */
  getThreads = async (page?: number, size?: number): Promise<{ data: { data: ThreadResponse[] } }> => {
    const params = new URLSearchParams();
    if (page) params.append("page", page.toString());
    if (size) params.append("size", size.toString());

    return this.get(`/threads${params.toString() ? `?${params.toString()}` : ""}`);
  };

  /**
   * GET /api/v1/threads/{parentId}/children - Get list of child threads
   */
  getChildThreads = async (parentId: string): Promise<{ data: { data: ThreadResponse[] } }> => {
    return this.get(`/threads/${parentId}/children`);
  };

  /**
   * GET /api/v1/threads/{threadId}/note - Get thread note
   */
  getThreadNote = async (threadId: string): Promise<{ data: { note: string } }> => {
    return this.get(`/threads/${threadId}/note`);
  };

  /**
   * PUT /api/v1/threads/{threadId}/note - Update thread note
   */
  updateThreadNote = async (threadId: string, note: string): Promise<{ data: { success: boolean } }> => {
    return this.put(`/threads/${threadId}/note`, { note });
  };

  /**
   * GET /api/v1/threads/{threadId} - Get thread state (with request deduplication)
   */
  getThread = async (
    threadId: string,
    options?: { noCache?: boolean },
  ): Promise<{ data: { data: ThreadResponse } }> => {
    const suffix = options?.noCache ? `?t=${Date.now()}` : "";
    const cacheKey = `${threadId}${options?.noCache ? `:${suffix}` : ""}`;
    if (!options?.noCache) {
      const existing = this.inflightGetThread.get(cacheKey);
      if (existing) return existing;
    }
    const req = this.get(`/threads/${threadId}${suffix}`).finally(() => {
      this.inflightGetThread.delete(cacheKey);
    });
    if (!options?.noCache) this.inflightGetThread.set(cacheKey, req);
    return req;
  };

  /**
   * POST /api/v1/threads/{threadId}/stream - Start AI streaming analysis
   * Note: This returns a streaming response, not a JSON response
   */
  streamAnalysis = async (threadId: string, userMessage?: string, isRetry?: boolean): Promise<any> => {
    const payload: StreamAnalysisRequest = {};
    if (userMessage) payload.user_message = userMessage;
    if (isRetry) payload.is_retry = isRetry;

    return this.post(`/threads/${threadId}/stream`, payload);
  };

  /**
   * Legacy methods for backward compatibility
   */

  /**
   * @deprecated Use createThread instead
   */
  createAnalysis = async (body: FormData | ThreadProblem): Promise<{ data: { data: CreateThreadResponse } }> => {
    // Transform to new format
    const problem = (body as any).problem || body;
    return this.createThread(problem as ThreadProblem);
  };

  /**
   * @deprecated Use getThread instead
   */
  getAnalysisSession = async (sessionId: string): Promise<{ data: { data: ThreadResponse } }> => {
    return this.getThread(sessionId);
  };

  /**
   * @deprecated Use streamAnalysis instead
   */
  startAnalysisStream = async (sessionId: string): Promise<any> => {
    return this.streamAnalysis(sessionId);
  };

  /**
   * @deprecated Use streamAnalysis instead
   */
  startAnalysis = async (sessionId: string, analysisData?: unknown): Promise<any> => {
    // Use stream endpoint for analysis
    return this.streamAnalysis(sessionId);
  };

  /**
   * @deprecated Use streamAnalysis instead
   */
  sendChatMessage = async (sessionId: string, message: string): Promise<any> => {
    // Use stream endpoint with user message
    return this.streamAnalysis(sessionId, message);
  };

  /**
   * PATCH /api/v1/threads/{threadId}/first-answer - Update first answer
   */
  updateFirstAnswer = async (threadId: string, firstAnswer: string | null): Promise<{ data: { success: boolean } }> => {
    return this.patch(`/threads/${threadId}/first-answer`, { first_answer: firstAnswer });
  };

  /**
   * DELETE /api/v1/threads/{threadId} - Delete a thread
   */
  deleteAnalysis = async (threadId: string): Promise<{ data: { success: boolean } }> => {
    return await this.delete(`/threads`, threadId);
  };

  /**
   * POST /api/v1/threads/export-excel - Export Why-Why analysis to Excel
   */
  exportToExcel = async (nodes: any[], fileName?: string): Promise<{ data: ArrayBuffer }> => {
    return this.post(`/threads/export-excel`, { nodes, fileName }, {
      responseType: 'arraybuffer'
    } as any);
  };

  /**
   * GET /api/v1/threads/internal-cases - Get internal cases (shared within company/group)
   */
  getInternalCases = async (
    page?: number,
    size?: number,
    search?: string,
    status?: string,
  ): Promise<{ data: { data: any[]; meta: any } }> => {
    const params = new URLSearchParams();
    if (page) params.append("page", page.toString());
    if (size) params.append("size", size.toString());
    if (search) params.append("search", search);
    if (status) params.append("status", status);

    return this.get(`/threads/internal-cases${params.toString() ? `?${params.toString()}` : ""}`);
  };

  /**
   * PATCH /api/v1/threads/{threadId}/visibility - Update visibility settings
   */
  updateVisibilitySettings = async (
    threadId: string,
    publicScope: "private" | "group" | "company",
    hideAuthorName: boolean,
  ): Promise<{ data: { thread_id: string; public_scope: string; hide_author_name: boolean; updated_at: string } }> => {
    return this.patch(`/threads/${threadId}/visibility`, {
      public_scope: publicScope,
      hide_author_name: hideAuthorName,
    });
  };
}

const whyWhyApiClient = new WhyWhyApiClient();
export default whyWhyApiClient;
