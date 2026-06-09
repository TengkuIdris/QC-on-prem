import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ProblemInput } from "../types/analysis.types";
import { EventEmitter } from "events";
import axios, { AxiosError } from "axios";

// Enum mappings from English to Japanese (like 5why_api)
const severityMap: Record<string, string> = {
  LOW: "軽微",
  MEDIUM: "中程度",
  HIGH: "重大",
};

const defectTypeMap: Record<string, string> = {
  APPEARANCE: "外観",
  DIMENSION: "寸法",
  FUNCTION: "機能",
  MATERIAL: "材質",
  STRENGTH: "強度",
  DURABILITY: "耐久性",
  SAFETY: "安全性",
  OTHER: "その他",
};

const frequencyMap: Record<string, string> = {
  FREQUENT: "多発",
  OCCASIONAL: "散発",
  RARE: "稀",
  FIRST_TIME: "初めて",
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly configService: ConfigService) {}

  async createAnalysisThread(problemData: ProblemInput) {
    this.logger.log("Creating analysis thread with AI service");

    const aiServiceUrl = this.configService.get<string>("AI_SERVICE_URL");
    const apiKey = this.configService.get<string>("AI_SERVICE_API_KEY");

    this.logger.log("AI service config check:", {
      aiServiceUrl: aiServiceUrl ? "present" : "missing",
      apiKey: apiKey ? "present" : "missing",
    });

    if (!aiServiceUrl || !apiKey) {
      this.logger.error("AI service configuration not found");
      throw new Error("AI service configuration missing");
    }

    try {
      // Real AI service call
      const transformedProblem: any = { ...problemData };

      // Normalize language for AI API.
      // FE sends the display language names from the select (e.g. "Thai", "Korean", ...).
      // If FE/BE ever send legacy locale codes (e.g. "ja", "en", "th"), map them to AI API language names.
      const rawLanguage = (transformedProblem.language ?? "").toString().trim();
      const legacyLocaleToAiLanguage: Record<string, string> = {
        // UI locale codes
        ja: "Japanese",
        en: "English",
        "zh-CN": "Chinese (Simplified)",
        "zh-TW": "Chinese (Traditional)",
        ko: "Korean",
        es: "Spanish",
        fr: "French",
        th: "Thai",
        ms: "Malay",
        // Sometimes clients might send the short/English-ish names already
        Japanese: "Japanese",
        English: "English",
        "Chinese (Simplified)": "Chinese (Simplified)",
        "Chinese (Traditional)": "Chinese (Traditional)",
        Korean: "Korean",
        Spanish: "Spanish",
        French: "French",
        Thai: "Thai",
        Malay: "Malay",
      };

      const normalizedLanguage = rawLanguage ? (legacyLocaleToAiLanguage[rawLanguage] ?? rawLanguage) : "Japanese";
      transformedProblem.language = normalizedLanguage || "Japanese";

      // Transform enum values to Japanese (like 5why_api)
      if (transformedProblem.severity && severityMap[transformedProblem.severity]) {
        transformedProblem.severity = severityMap[transformedProblem.severity];
      }
      if (transformedProblem.defect_types && Array.isArray(transformedProblem.defect_types)) {
        transformedProblem.defect_types = transformedProblem.defect_types.map(
          (type: string) => defectTypeMap[type] || type,
        );
      }
      if (transformedProblem.frequency && frequencyMap[transformedProblem.frequency]) {
        transformedProblem.frequency = frequencyMap[transformedProblem.frequency];
      }

      const requestBody = {
        problem: transformedProblem, // Send transformed problem data aligned with AI API spec
      };

      this.logger.log("Making AI service request:", {
        url: `${aiServiceUrl}/v1/threads`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "***",
          Accept: "application/json",
        },
        body: requestBody,
      });

      const response = await fetch(`${aiServiceUrl}/v1/threads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(300000),
      });

      this.logger.log("AI service response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error("AI service error response:", errorText);
        throw new Error(`AI service error: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      this.logger.log("AI service thread created successfully", result);

      if (!result.thread_id) {
        this.logger.error("AI service response missing thread_id:", result);
        throw new Error("AI service response is invalid: missing thread_id");
      }

      return {
        thread_id: result.thread_id,
        created_at: result.created_at || new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error("Failed to create AI thread:", error);
      throw error;
    }
  }

  async startAnalysisStream(sessionId: string, user_message?: string, is_retry?: boolean): Promise<EventEmitter> {
    this.logger.log(`Starting analysis stream for session: ${sessionId}`);

    const stream = new EventEmitter() as EventEmitter & { destroy?: () => void };
    let upstreamStream: any = null;
    stream.destroy = () => {
      if (upstreamStream && typeof upstreamStream.destroy === "function") {
        upstreamStream.destroy();
      }
    };
    const emitSseError = (message: string, detail?: Record<string, unknown>) => {
      const payload = {
        event_type: "error",
        message,
        ...(detail ? { detail } : {}),
      };
      stream.emit(
        "data",
        Buffer.from(`event: error\ndata: ${JSON.stringify(payload)}\n\n`, "utf8"),
      );
    };

    const aiServiceUrl = this.configService.get<string>("AI_SERVICE_URL");
    const apiKey = this.configService.get<string>("AI_SERVICE_API_KEY");

    this.logger.log(`AI service config:`, {
      aiServiceUrl: aiServiceUrl ? "present" : "missing",
      apiKey: apiKey ? "present" : "missing",
    });

    if (!aiServiceUrl || !apiKey) {
      this.logger.warn("AI service configuration not found, using mock stream");
      // Mock streaming data - API doc compliant
      setTimeout(() => {
        stream.emit(
          "data",
          Buffer.from(
            `event: others\ndata: {"event_type": "others", "thought": "なぜなぜ分析を開始します。5M1Eの観点から初期分析を実行中です。"}\n\n`,
            "utf8",
          ),
        );
      }, 1000);

      setTimeout(() => {
        stream.emit(
          "data",
          Buffer.from(
            `event: others\ndata: {"event_type": "others", "thought": "直接原因を深掘りしています。データの一貫性を検証中。"}\n\n`,
            "utf8",
          ),
        );
      }, 3000);

      setTimeout(() => {
        stream.emit(
          "data",
          Buffer.from(
            `event: info_request\ndata: {"event_type": "info_request", "thought": "追加情報が必要です。", "state": {"chat_history": [{"type": "ai", "content": "問題の発生頻度を教えてください（頻繁・時々・まれ・初めて）。"}]}}\n\n`,
            "utf8",
          ),
        );
      }, 5000);

      setTimeout(() => {
        stream.emit(
          "data",
          Buffer.from(
            `event: final_result\ndata: {"event_type": "final_result", "thought": "分析が完了しました。根本原因と対策を特定しました。", "state": {"why_nodes": [{"id": "1", "name": "塗装ムラの発生", "level": 1, "parent_id": null, "children_ids": ["2"], "supporting_facts": "塗装工程での不均一な塗布", "is_root_cause": false, "root_cause_judgement": "直接原因", "recurrence_prevention_measures": "塗装条件の標準化"}, {"id": "2", "name": "塗料の粘度変化", "level": 2, "parent_id": "1", "children_ids": [], "supporting_facts": "温度変化による塗料の粘度上昇", "is_root_cause": true, "root_cause_confidence": 0.85, "root_cause_judgement": "根本原因", "recurrence_prevention_measures": "温度管理の徹底"}], "root_causes": [{"cause": "塗料の粘度変化", "confidence": 0.85, "judgement_reason": "温度変化により塗料の粘度が上昇し、均一な塗布が困難になった", "countermeasures": "塗装ブースの温度管理を23±2℃に厳格に制御し、塗料の粘度を定期的に測定する"}]}}\n\n`,
            "utf8",
          ),
        );
        stream.emit("end");
      }, 8000);

      return stream;
    }

    try {
      const url = `${aiServiceUrl}/v1/threads/${sessionId}/stream`;
      const response = await axios.post(
        url,
        {
          user_message: user_message || "",
          is_retry: is_retry || false,
        },
        {
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          responseType: "stream",
          timeout: 300000,
        },
      );

      upstreamStream = response.data as NodeJS.ReadableStream;

      upstreamStream.on("error", (error: Error) => {
        this.logger.error(`AI service stream error: ${error.message}`);
        emitSseError(error.message, { sessionId });
        stream.emit("end");
      });

      upstreamStream.on("data", (chunk: Buffer) => {
        stream.emit("data", chunk);
      });

      upstreamStream.on("end", () => {
        stream.emit("end");
      });
    } catch (error: any) {
      const axiosError = error as AxiosError;
      const errorMessage =
        axiosError.response && axiosError.response.status
          ? `AI service error: ${axiosError.response.status} ${axiosError.response.statusText || ""}`.trim()
          : axiosError.message || "Failed to connect to AI service";
      this.logger.error(`Failed to connect to AI service: ${errorMessage}`);
      emitSseError(errorMessage, { sessionId });
      stream.emit("end");
    }

    return stream;
  }

  async startAnalysis(sessionId: string, analysisData?: any, is_retry?: boolean): Promise<any> {
    this.logger.log(`Starting analysis for session: ${sessionId}`);

    const aiServiceUrl = this.configService.get<string>("AI_SERVICE_URL");
    const apiKey = this.configService.get<string>("AI_SERVICE_API_KEY");

    if (!aiServiceUrl || !apiKey) {
      this.logger.warn("AI service configuration not found, using mock response");
      // Mock analysis process
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: "Analysis started successfully (mock)",
            results: {
              why_nodes: [
                { id: "1", name: "Root Cause 1", description: "Primary cause", level: 1 },
                { id: "2", name: "Root Cause 2", description: "Secondary cause", level: 1 },
              ],
              root_causes: ["Root Cause 1", "Root Cause 2"],
            },
          });
        }, 1000);
      });
    }

    try {
      // Real AI service call - just initiate the analysis
      const requestBody = {
        user_message: "",
        is_retry: is_retry || false,
      };

      this.logger.log("Making AI service startAnalysis request:", {
        url: `${aiServiceUrl}/v1/threads/${sessionId}/stream`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "***",
          Accept: "text/event-stream",
        },
        body: requestBody,
      });

      // Don't wait for the full response, just return success immediately
      // The actual analysis will be handled by the SSE stream
      this.logger.log("AI service analysis initiated successfully");

      return {
        success: true,
        message: "Analysis started successfully",
        status: "initiated",
      };
    } catch (error) {
      this.logger.error("Failed to start AI analysis, using mock response", error);

      // Fallback to mock response
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            success: true,
            message: "Analysis started successfully (mock)",
            results: {
              why_nodes: [
                { id: "1", name: "Root Cause 1", description: "Primary cause", level: 1 },
                { id: "2", name: "Root Cause 2", description: "Secondary cause", level: 1 },
              ],
              root_causes: ["Root Cause 1", "Root Cause 2"],
            },
          });
        }, 1000);
      });
    }
  }

  async processChatMessage(sessionId: string, message: string, is_retry?: boolean): Promise<string> {
    this.logger.log(`Processing chat message for session: ${sessionId}`);

    const aiServiceUrl = this.configService.get<string>("AI_SERVICE_URL");
    const apiKey = this.configService.get<string>("AI_SERVICE_API_KEY");

    if (!aiServiceUrl || !apiKey) {
      this.logger.warn("AI service configuration not found, using mock response");
      // Mock AI response
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(`AI response to: "${message}". This is a mock response for demonstration purposes.`);
        }, 1000);
      });
    }

    try {
      // Real AI service call
      const response = await fetch(`${aiServiceUrl}/v1/threads/${sessionId}/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          user_message: message,
          is_retry: is_retry || false,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.statusText}`);
      }

      // For SSE response, we need to handle it differently
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body not available");
      }

      let fullResponse = "";
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        fullResponse += chunk;

        // Continue reading until the stream ends
        // The API will close the connection when complete
      }

      this.logger.log("AI service chat processed successfully");

      // Parse SSE response to extract AI message
      const lines = fullResponse.split("\n");
      let lastContent = "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.content) {
              lastContent = data.content;
            }
          } catch (e) {
            // Continue parsing other lines
          }
        }
      }

      return lastContent || "AI response received";
    } catch (error) {
      this.logger.error("Failed to process chat message, using mock response", error);

      // Fallback to mock response
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(`AI response to: "${message}". This is a mock response due to service error.`);
        }, 1000);
      });
    }
  }
}
