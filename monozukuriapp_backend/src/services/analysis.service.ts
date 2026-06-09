import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { Observable, interval, map, take, switchMap, concat, of } from "rxjs";
import { PrismaService } from "./prisma.service";
import { AiService } from "./ai.service";
import { ProblemInput, ProblemInputSchema, AnalysisSession } from "../types/analysis.types";
import { validateData } from "../utils/api-response.util";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { Prisma } from "@prisma/client";

interface SSEMessage {
  id?: string;
  type:
  | "final_result"
  | "info_request"
  | "others"
  | "analysis_state"
  | "connection_end"
  | "connection_start"
  | "ping"
  | "error"
  | "analysis_started"
  | "analysis_progress"
  | "analysis_completed"
  | "analysis_error"
  | "node_updated"
  | "chat_message"
  | "root_cause_analysis";
  data: any;
  timestamp: string;
  session_id: string;
}

@Injectable()
export class AnalysisService {
  private readonly logger = new Logger(AnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
  ) { }

  async createAnalysisSession(
    problemData: ProblemInput,
    userId: number,
    parentId?: string,
  ): Promise<{ thread_id: string; created_at: string }> {
    // Validate input data
    const validation = validateData(ProblemInputSchema, problemData);
    if (!validation.success) {
      const errorDetails = JSON.stringify((validation as any).errors, null, 2);
      throw new Error(`Invalid request body. Issues: ${errorDetails}`);
    }

    this.logger.log("Analysis session creation started", {
      userId,
      operation: "create_session",
      problemTitle: problemData.title,
    });

    // Create analysis thread with AI service
    const thread = await this.aiService.createAnalysisThread(problemData);
    const threadId = thread.thread_id;

    this.logger.log("AI service thread created successfully", {
      threadId,
      userId,
      createdAt: thread.created_at,
    });

    // Create session in database
    const currentTime = new Date();
    const sessionData: any = {
      id: threadId,
      title: problemData.title,
      ownerId: userId,
      participants: [userId],
      status: "in_progress",
      analysisData: {
        id: threadId,
        status: "not_started",
        problem: problemData,
        chat_history: [],
        why_nodes: [],
        root_causes: [],
        created_at: thread.created_at || currentTime.toISOString(),
        updated_at: thread.created_at || currentTime.toISOString(),
      },
    };

    // Add parent_id if creating child session
    // Only set parentId if parent session exists and belongs to current user
    if (parentId) {
      // Verify parent session exists and belongs to user
      const parentSession = await this.prisma.analysisSession.findFirst({
        where: {
          id: parentId,
          ownerId: userId,
        },
      });

      // Only set parentId if parent belongs to current user
      // If parent doesn't belong to user, create session without parentId (normal session)
      if (parentSession) {
        sessionData.parentId = parentId;
      } else {
        this.logger.warn("Parent session not found or doesn't belong to user, creating session without parentId", {
          parentId,
          userId,
        });
      }
    }

    const newSession = await this.prisma.analysisSession.create({
      data: sessionData,
    });

    // Update parent's children count only if parentId was actually set (parent belongs to user)
    if (sessionData.parentId) {
      await this.prisma.analysisSession.update({
        where: { id: sessionData.parentId },
        data: {
          childrenCount: {
            increment: 1,
          },
        },
      });
    }

    this.logger.log("Analysis session created successfully", {
      sessionId: threadId,
      userId,
    });

    // Return format according to API documentation
    return {
      thread_id: threadId,
      created_at: thread.created_at || currentTime.toISOString(),
    };
  }

  async getAnalysisSession(
    sessionId: string,
    userId: number,
  ): Promise<{
    thread_id: string;
    created_at: string;
    updated_at: string;
    status: string;
    state: any;
    public_scope?: string;
    hide_author_name?: boolean;
    requires_visibility_config?: boolean;
  }> {
    const session = await this.prisma.analysisSession.findUnique({
      where: { id: sessionId },
      include: {
        owner: {
          select: {
            id: true,
            affiliation: true,
            company: true,
            company_id: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException("Analysis session not found");
    }

    // Check if user has access
    // 1. If user is owner or participant, allow access
    const isOwnerOrParticipant = session.ownerId === userId || session.participants.includes(userId);

    if (isOwnerOrParticipant) {
      // User has direct access (owner or participant can always access)
    } else {
      // 2. Check if session is shared (publicScope is group or company)
      // Only completed sessions can be shared
      if (session.status !== "completed") {
        throw new ForbiddenException("Access denied to this session");
      }

      const publicScope = session.publicScope || "private";

      // Special case: session is private (not shared via group/company)
      // For this specific case, return a 400-style error so frontend can
      // show a specific message and redirect, instead of treating it as auth error.
      if (publicScope === "private") {
        throw new BadRequestException("THREAD_VISIBILITY_CHANGED");
      }

      // Get current user info to check group/company match
      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          affiliation: true,
          company: true,
          company_id: true,
        },
      });

      if (!currentUser) {
        throw new ForbiddenException("User not found");
      }

      // Check group scope
      if (publicScope === "group") {
        if (!currentUser.affiliation || !session.owner.affiliation) {
          throw new ForbiddenException("Access denied to this session");
        }
        if (session.owner.affiliation !== currentUser.affiliation) {
          throw new ForbiddenException("Access denied to this session");
        }
      }

      // Check company scope
      if (publicScope === "company") {
        let hasAccess = false;
        if (currentUser.company && session.owner.company) {
          hasAccess = session.owner.company === currentUser.company;
        }
        if (!hasAccess && currentUser.company_id && session.owner.company_id) {
          hasAccess = session.owner.company_id === currentUser.company_id;
        }
        if (!hasAccess) {
          throw new ForbiddenException("Access denied to this session");
        }
      }
    }

    // Return format according to API documentation
    return {
      thread_id: session.id,
      created_at: session.createdAt.toISOString(),
      updated_at: session.updatedAt.toISOString(),
      status: session.status,
      state: session.analysisData || {
        problem: {},
        chat_history: [],
        why_nodes: [],
        root_causes: [],
      },
      public_scope: session.publicScope || "private",
      hide_author_name: session.hideAuthorName ?? false,
      requires_visibility_config: (session as any).requiresVisibilityConfig ?? false,
    };
  }

  async updateAnalysisSession(sessionId: string, analysisData: any, userId: number): Promise<void> {
    // Verify user has access
    const session = await this.getAnalysisSession(sessionId, userId);

    // Update session
    await this.prisma.analysisSession.update({
      where: { id: sessionId },
      data: {
        analysisData,
        updatedAt: new Date(),
      },
    });

    this.logger.log("Analysis session updated", {
      sessionId,
      userId,
    });
  }

  async startAnalysisStream(sessionId: string, userId: number) {
    // Verify user has access
    await this.getAnalysisSession(sessionId, userId);

    // Update session status
    await this.prisma.analysisSession.update({
      where: { id: sessionId },
      data: {
        analysisData: {
          status: "running",
        },
      },
    });

    this.logger.log("Starting analysis stream", {
      sessionId,
      userId,
      operation: "start_stream",
    });

    return this.aiService.startAnalysisStream(sessionId);
  }

  createSSEStream(
    sessionId: string,
    userId: number,
    requestBody?: { user_message?: string; is_retry?: boolean },
  ): Observable<SSEMessage> {
    return new Observable<SSEMessage>((observer) => {
      this.logger.log(`Starting SSE stream for session: ${sessionId}, user: ${userId}`);
      this.logger.log(`Request body: ${JSON.stringify(requestBody)}`);

      let aiStream: any = null;
      let isClientDisconnected = false;
      let hasEmittedData = false; // Track if we've emitted any real data
      const heartbeatMs = 15000;
      let pingTimer: NodeJS.Timeout | null = null;

      // Emit connection_start immediately to keep proxies from timing out idle connections
      try {
        observer.next({
          id: `start-${Date.now()}`,
          type: "connection_start" as any,
          data: { message: "stream opened" },
          timestamp: new Date().toISOString(),
          session_id: sessionId,
        });
        this.logger.log(`Emitted connection_start for session: ${sessionId}`);
      } catch (error) {
        this.logger.error(`Failed to emit connection_start: ${error.message}`);
      }

      // Start heartbeat pings to keep the connection alive
      pingTimer = setInterval(() => {
        if (!isClientDisconnected) {
          observer.next({
            id: `ping-${Date.now()}`,
            type: "ping" as any,
            data: { ts: Date.now() },
            timestamp: new Date().toISOString(),
            session_id: sessionId,
          });
        }
      }, heartbeatMs);

      // Handle client disconnect
      const handleClientDisconnect = () => {
        isClientDisconnected = true;
        this.logger.log(`Client disconnected, stopping stream for session: ${sessionId}`);
        if (aiStream) {
          aiStream.destroy();
          aiStream = null;
        }
        if (pingTimer) {
          clearInterval(pingTimer);
          pingTimer = null;
        }
        observer.complete();
      };

      // Get the session from database
      this.prisma.analysisSession
        .findUnique({
          where: { id: sessionId },
        })
        .then((session) => {
          if (!session) {
            this.logger.error(`Session not found: ${sessionId}`);
            observer.error(new Error("Session not found"));
            return;
          }

          this.logger.log(`Session found: ${sessionId}, status: ${session.status}`);

          let lastKnownState: any = (session.analysisData as any) || null;
          let lastKnownStatus: string | null = session.status;
          let persistenceChain: Promise<void> = Promise.resolve();

          const persistStateFromMessage = (message: SSEMessage) => {
            const hasIncomingState = !!message.data?.state;
            const forceStatusUpdate =
              message.type === "info_request" ||
              message.type === "final_result" ||
              message.type === "analysis_completed" ||
              message.type === "analysis_error" ||
              message.type === "error";

            if (!hasIncomingState && !forceStatusUpdate) {
              return;
            }

            const candidateState = hasIncomingState
              ? { ...message.data.state }
              : lastKnownState
                ? { ...lastKnownState }
                : null;

            const derivedStatus = this.deriveStatusFromEvent(message.type, candidateState?.status);

            if (!candidateState) {
              if (derivedStatus) {
                lastKnownStatus = derivedStatus;
                persistenceChain = persistenceChain
                  .then(() =>
                    this.prisma.analysisSession.update({
                      where: { id: sessionId },
                      data: {
                        status: derivedStatus,
                        updatedAt: new Date(),
                      },
                    }),
                  )
                  .then(() => void 0)
                  .catch((error) => {
                    this.logger.error("Failed to persist SSE status update", {
                      sessionId,
                      eventType: message.type,
                      error: error.message,
                    });
                  });
              }
              return;
            }

            if (candidateState.first_answer === undefined && lastKnownState?.first_answer !== undefined) {
              candidateState.first_answer = lastKnownState.first_answer;
            }

            if (derivedStatus) {
              candidateState.status = derivedStatus;
            }

            lastKnownState = candidateState;
            lastKnownStatus = candidateState.status || derivedStatus || lastKnownStatus;

            let updatedAt: Date;
            if (candidateState.updated_at) {
              const parsed = new Date(candidateState.updated_at);
              updatedAt = isNaN(parsed.getTime()) ? new Date() : parsed;
            } else {
              updatedAt = new Date();
            }

            // Check if root cause exists (stream thành công)
            // candidateState.why_nodes mỗi lần chỉ chứa 1 object (format: { 'node_id': {...} })
            let hasRootCause = false;
            let whyNodesArray: any[] = [];
            if (candidateState.why_nodes && typeof candidateState.why_nodes === "object") {
              // Convert object → array để check
              whyNodesArray = Array.isArray(candidateState.why_nodes)
                ? candidateState.why_nodes
                : Object.values(candidateState.why_nodes);
              hasRootCause = whyNodesArray.some((node: any) => node?.is_root_cause === true);
            }
            // Also check root_causes array if exists
            if (!hasRootCause && Array.isArray(candidateState.root_causes) && candidateState.root_causes.length > 0) {
              hasRootCause = true;
            }
            const updateData: any = {
              analysisData: candidateState,
              status: lastKnownStatus || undefined,
              updatedAt,
            };

            // Set requiresVisibilityConfig = true khi có event "root_cause_analysis" với is_root_cause === true
            // Mỗi lần có event này với root cause thì set luôn, không cần check lại
            if (message.type === "root_cause_analysis" && hasRootCause) {
              updateData.requiresVisibilityConfig = true;
            }

            persistenceChain = persistenceChain
              .then(() =>
                this.prisma.analysisSession.update({
                  where: { id: sessionId },
                  data: updateData,
                }),
              )
              .then(() => void 0)
              .catch((error) => {
                this.logger.error("Failed to persist SSE state update", {
                  sessionId,
                  eventType: message.type,
                  error: error.message,
                });
              });
          };

          const emitStateSnapshot = (reason: "complete" | "error") => {
            if (!lastKnownState && !lastKnownStatus) {
              return;
            }

            const snapshotData: any = {
              reason,
              status: lastKnownStatus || lastKnownState?.status,
            };

            if (lastKnownState) {
              snapshotData.state = lastKnownState;
            }

            const snapshot: SSEMessage = {
              id: `state-${Date.now()}`,
              type: "analysis_state" as const,
              data: snapshotData,
              timestamp: new Date().toISOString(),
              session_id: sessionId,
            };

            observer.next(snapshot);
          };

          const finalizeStream = (reason: "complete" | "error", finalizeObserver: () => void) => {
            persistenceChain
              .catch((error) => {
                this.logger.error("Error while finalizing SSE persistence chain", {
                  sessionId,
                  error: error.message,
                });
              })
              .then(() => emitStateSnapshot(reason))
              .finally(() => {
                if (pingTimer) {
                  clearInterval(pingTimer);
                  pingTimer = null;
                }
                finalizeObserver();
              });
          };

          const processParsedMessage = (parsedMessage: SSEMessage) => {
            if (!isClientDisconnected && parsedMessage) {
              // Log all messages for debugging
              this.logger.log(`Processing parsed message: type=${parsedMessage.type}, hasData=${!!parsedMessage.data}`);

              // Skip connection_end from AI service if it comes too early (before any actual data)
              // This prevents premature stream closure
              if (parsedMessage.type === "connection_end" && !hasEmittedData && !lastKnownState) {
                this.logger.warn(`Ignoring early connection_end from AI service for session: ${sessionId} (no data emitted yet)`);
                return;
              }

              // Mark that we've emitted real data (not just connection_start/ping)
              if (parsedMessage.type !== "connection_start" && parsedMessage.type !== "ping" && parsedMessage.type !== "connection_end") {
                hasEmittedData = true;
              }

              persistStateFromMessage(parsedMessage);
              if (lastKnownState) {
                parsedMessage.data = parsedMessage.data || {};
                if (!parsedMessage.data.state) {
                  parsedMessage.data = {
                    ...parsedMessage.data,
                    state: lastKnownState,
                  };
                }
              }
              if (lastKnownStatus && parsedMessage.data) {
                parsedMessage.data.status = parsedMessage.data.status || lastKnownStatus;
              }
              const enrichedMessage = {
                ...parsedMessage,
                session_id: sessionId,
              };

              try {
                observer.next(enrichedMessage);
                this.logger.log(`Successfully emitted message type=${enrichedMessage.type} for session: ${sessionId}`);
              } catch (error) {
                this.logger.error(`Failed to emit message to observer: ${error.message}`);
                // Don't throw, continue processing
              }
            }
          };

          // Call external AI service using startAnalysisStream
          this.aiService
            .startAnalysisStream(sessionId, requestBody?.user_message, requestBody?.is_retry)
            .then((stream) => {
              aiStream = stream;
              this.logger.log(`AI service stream created for session: ${sessionId}`);

              // Buffer for incomplete SSE messages
              let buffer = "";

              stream.on("data", (chunk: Buffer) => {
                // Check if client is still connected
                if (isClientDisconnected) {
                  this.logger.log(`Client disconnected, skipping data processing for session: ${sessionId}`);
                  return;
                }

                const message = chunk.toString("utf8");
                this.logger.log(
                  `Raw chunk from AI service (${message.length} chars): ${message.substring(0, 300)}...`,
                );

                // Add to buffer
                buffer += message;

                // Process complete SSE messages
                const messages = this.parseSSEMessages(buffer);

                // Keep incomplete message in buffer
                buffer = messages.remainingBuffer;

                // Send complete messages
                this.logger.log(`Processing ${messages.completeMessages.length} complete messages from AI service`);
                messages.completeMessages.forEach(processParsedMessage);
              });

              stream.on("error", (error) => {
                if (!isClientDisconnected) {
                  this.logger.error(`AI service stream error: ${error.message}`);
                  finalizeStream("error", () => observer.error(error));
                }
              });

              stream.on("end", () => {
                if (!isClientDisconnected) {
                  this.logger.log(`AI service stream completed for session: ${sessionId}`);
                  if (buffer.trim().length) {
                    const messages = this.parseSSEMessages(`${buffer}\n\n`);
                    buffer = "";
                    messages.completeMessages.forEach(processParsedMessage);
                  }
                  finalizeStream("complete", () => observer.complete());
                }
              });
            })
            .catch((error) => {
              if (!isClientDisconnected) {
                this.logger.error(`Failed to create AI service stream: ${error.message}`);
                if (pingTimer) {
                  clearInterval(pingTimer);
                  pingTimer = null;
                }
                observer.error(error);
              }
            });
        })
        .catch((error) => {
          if (!isClientDisconnected) {
            this.logger.error(`Database error: ${error.message}`);
            if (pingTimer) {
              clearInterval(pingTimer);
              pingTimer = null;
            }
            observer.error(error);
          }
        });

      // Return cleanup function
      return () => {
        handleClientDisconnect();
      };
    });
  }

  private deriveStatusFromEvent(eventType: SSEMessage["type"], fallback?: string): string | undefined {
    switch (eventType) {
      case "info_request":
        return "waiting_for_input";
      case "final_result":
      case "analysis_completed":
        return "completed";
      case "analysis_error":
      case "error":
        return "failed";
      case "analysis_started":
      case "analysis_progress":
      case "others":
      case "node_updated":
      case "chat_message":
        return fallback || "running";
      default:
        return fallback;
    }
  }

  private parseSSEMessages(buffer: string): { completeMessages: SSEMessage[]; remainingBuffer: string } {
    const completeMessages: SSEMessage[] = [];
    let remainingBuffer = buffer;

    // Split by double newlines to find complete SSE messages
    const messageParts = buffer.split("\n\n");

    // Process all but the last part (which might be incomplete)
    for (let i = 0; i < messageParts.length - 1; i++) {
      const messagePart = messageParts[i];
      if (messagePart.trim()) {
        const parsedMessage = this.parseSingleSSEMessage(messagePart);
        if (parsedMessage) {
          completeMessages.push(parsedMessage);
        }
      }
    }

    // Keep the last part as remaining buffer
    remainingBuffer = messageParts[messageParts.length - 1] || "";

    return { completeMessages, remainingBuffer };
  }

  private parseSingleSSEMessage(messageText: string): SSEMessage | null {
    try {
      const lines = messageText.split("\n");
      let currentEvent = "others";
      let currentData = null;

      this.logger.log(`Parsing SSE message with ${lines.length} lines`);

      for (const line of lines) {
        this.logger.log(`Processing line: "${line.substring(0, 100)}..."`);

        if (line.startsWith("event: ")) {
          currentEvent = line.substring(7).trim();
          this.logger.log(`Event type found: ${currentEvent}`);
        } else if (line.startsWith("data: ")) {
          try {
            const dataText = line.substring(6);
            currentData = JSON.parse(dataText);
            this.logger.log(`Data parsed successfully for event: ${currentEvent}`);
          } catch (error) {
            this.logger.error(`Failed to parse data line: ${line.substring(0, 100)}...`);
            // Continue with next line instead of failing completely
          }
        }
      }

      if (currentData) {
        const message: SSEMessage = {
          id: `sse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: currentEvent as any,
          data: currentData,
          timestamp: new Date().toISOString(),
          session_id: "current", // Will be set by the caller
        };

        this.logger.log(`Successfully parsed SSE message: ${currentEvent}`);
        return message;
      }

      return null;
    } catch (error) {
      this.logger.error(`Error parsing SSE message: ${error.message}`);
      return null;
    }
  }

  async sendChatMessage(sessionId: string, userId: number, message: string): Promise<any> {
    // Verify user has access by getting session from database
    const session = await this.prisma.analysisSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException("Analysis session not found");
    }

    if (!session.participants.includes(userId)) {
      throw new ForbiddenException("Access denied to this session");
    }

    this.logger.log("Sending chat message", { sessionId, userId, message });

    // Add message to chat history
    const analysisData = (session.analysisData as any) || {};
    const chatHistory = analysisData.chat_history || [];
    const newMessage = {
      id: Date.now().toString(),
      user_id: userId,
      message,
      timestamp: new Date().toISOString(),
      type: "user",
    };

    chatHistory.push(newMessage);

    // Update session with new chat message
    await this.prisma.analysisSession.update({
      where: { id: sessionId },
      data: {
        analysisData: {
          ...analysisData,
          chat_history: chatHistory,
        },
      },
    });

    this.logger.log("Chat message added to session", { sessionId, userId, messageId: newMessage.id });

    // Send message to AI service for processing
    try {
      const aiServiceUrl = this.configService.get<string>("AI_SERVICE_URL");
      const apiKey = this.configService.get<string>("AI_SERVICE_API_KEY");

      if (!aiServiceUrl || !apiKey) {
        throw new Error("AI service configuration missing");
      }

      const url = `${aiServiceUrl}/v1/threads/${sessionId}/chat`;

      const response = await axios.post(
        url,
        {
          user_message: message,
          chat_history: chatHistory,
        },
        {
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
          },
        },
      );

      this.logger.log("AI service chat response received", { sessionId, status: response.status });

      return {
        success: true,
        message: "Message sent successfully",
        data: {
          analysisData: {
            ...analysisData,
            chat_history: chatHistory,
          },
          aiResponse: response.data,
        },
      };
    } catch (error) {
      this.logger.error("Error sending message to AI service", { sessionId, error: error.message });

      // Still return success for the message storage
      return {
        success: true,
        message: "Message sent successfully (AI processing failed)",
        data: {
          analysisData: {
            ...analysisData,
            chat_history: chatHistory,
          },
        },
      };
    }
  }

  async getThreadFromDatabase(sessionId: string, userId: number): Promise<any> {
    // Get session from database
    const session = await this.prisma.analysisSession.findUnique({
      where: { id: sessionId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            full_name: true,
            affiliation: true,
            department: true,
            company: true,
            company_id: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException("Analysis session not found");
    }

    const analysisData = (session.analysisData as any) || {
      problem: {},
      chat_history: [],
      why_nodes: [],
      root_causes: [],
    };

    // Format response to match AI service format
    return {
      thread_id: session.id,
      created_at: session.createdAt.toISOString(),
      updated_at: session.updatedAt.toISOString(),
      status: session.status,
      state: analysisData,
      parent_id: session.parentId || null,
      children_count: session.childrenCount ?? 0,
      is_child: !!session.parentId,
      first_answer: session.firstAnswer || analysisData.first_answer || null,
      owner: session.owner,
      title: session.title,
      public_scope: session.publicScope || "private",
      hide_author_name: session.hideAuthorName || false,
      requires_visibility_config: (session as any).requiresVisibilityConfig ?? false,
    };
  }

  async getThreadFromAIService(sessionId: string, userId: number): Promise<any> {
    // Verify user has access to session in database first
    await this.getAnalysisSession(sessionId, userId);

    // Get AI service configuration
    const aiServiceUrl = this.configService.get<string>("AI_SERVICE_URL");
    const apiKey = this.configService.get<string>("AI_SERVICE_API_KEY");

    if (!aiServiceUrl || !apiKey) {
      throw new Error("AI service configuration not found");
    }

    try {
      // Call AI service to get thread data
      const response = await fetch(`${aiServiceUrl}/v1/threads/${sessionId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
      });

      // If AI service returns 404, fallback to database
      if (response.status === 404) {
        this.logger.warn("Thread not found in AI service, falling back to database", { sessionId });
        return this.getThreadFromDatabase(sessionId, userId);
      }

      if (!response.ok) {
        throw new Error(`AI service error: ${response.statusText}`);
      }

      const aiThreadData = await response.json();

      // Enrich AI response with DB relationship info (parent/children) and visibility settings
      try {
        const sessionMeta = await this.prisma.analysisSession.findUnique({
          where: { id: sessionId },
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                full_name: true,
              },
            },
          },
        });

        // Attach parent/children info for frontend consumption
        (aiThreadData as any).parent_id = (sessionMeta as any)?.parentId || null;
        (aiThreadData as any).children_count = (sessionMeta as any)?.childrenCount ?? 0;
        (aiThreadData as any).is_child = !!(sessionMeta as any)?.parentId;
        const ad: any = (sessionMeta as any)?.analysisData || {};
        (aiThreadData as any).first_answer = (sessionMeta as any)?.firstAnswer ?? ad?.first_answer ?? null;

        // Attach owner info
        (aiThreadData as any).owner = (sessionMeta as any)?.owner || null;

        // Attach visibility settings
        (aiThreadData as any).public_scope = (sessionMeta as any)?.publicScope || "private";
        (aiThreadData as any).hide_author_name = (sessionMeta as any)?.hideAuthorName ?? false;
        (aiThreadData as any).requires_visibility_config = (sessionMeta as any)?.requiresVisibilityConfig ?? false;
        // Also include camelCase for backward compatibility
        (aiThreadData as any).publicScope = (sessionMeta as any)?.publicScope || "private";
        (aiThreadData as any).hideAuthorName = (sessionMeta as any)?.hideAuthorName ?? false;
        (aiThreadData as any).requiresVisibilityConfig = (sessionMeta as any)?.requiresVisibilityConfig ?? false;
      } catch (relationEnrichError) {
        this.logger.warn("Failed to enrich AI thread data with relationship info (non-fatal)", {
          sessionId,
          error: (relationEnrichError as any)?.message,
        });
      }

      // Persist latest details into DB
      try {
        // Get current session to preserve first_answer
        const currentSession = await this.prisma.analysisSession.findUnique({
          where: { id: sessionId },
          select: { analysisData: true },
        });

        const currentAnalysisData: any = currentSession?.analysisData || {};
        const preservedFirstAnswer = currentAnalysisData.first_answer;
        // Preserve language chosen by the user at thread creation time.
        // Some upstream AI responses may normalize / default language, which then overwrites DB and breaks FE select sync.
        const preservedProblemLanguage = currentAnalysisData?.problem?.language;

        // Merge AI state with preserved first_answer
        const mergedAnalysisData = aiThreadData.state
          ? {
            ...aiThreadData.state,
            first_answer: preservedFirstAnswer, // Preserve existing first_answer
          }
          : currentAnalysisData;

        if (preservedProblemLanguage && mergedAnalysisData?.problem) {
          mergedAnalysisData.problem.language = preservedProblemLanguage;
          // Also keep the returned payload consistent for frontend.
          if (aiThreadData?.state?.problem) {
            aiThreadData.state.problem.language = preservedProblemLanguage;
          }
        }

        await this.prisma.analysisSession.update({
          where: { id: sessionId },
          data: {
            status: aiThreadData.status || undefined,
            analysisData: mergedAnalysisData,
            updatedAt: aiThreadData.updated_at ? new Date(aiThreadData.updated_at) : undefined,
            title: aiThreadData.state?.problem?.title || undefined,
          },
        });
      } catch (persistError: any) {
        this.logger.warn("Failed to persist AI thread details to DB (non-fatal)", {
          sessionId,
          error: persistError.message,
        });
      }

      this.logger.log("AI service thread data retrieved successfully", {
        sessionId,
        userId,
      });

      return aiThreadData;
    } catch (error) {
      this.logger.error("Failed to get thread from AI service", {
        sessionId,
        userId,
        error: (error as any).message,
      });
      throw error;
    }
  }

  async getUserThreads(userId: number, page: number = 1, pageSize: number = 10): Promise<any> {
    try {
      const skip = (page - 1) * pageSize;

      const [sessions, total] = await Promise.all([
        this.prisma.analysisSession.findMany({
          where: {
            participants: {
              has: userId,
            },
            parentId: null, // Only get parent sessions
          },
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            analysisData: true,
            parentId: true,
            childrenCount: true,
            ...({ publicScope: true, hideAuthorName: true } as any),
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                full_name: true,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          skip,
          take: pageSize,
        }),
        this.prisma.analysisSession.count({
          where: {
            participants: {
              has: userId,
            },
            parentId: null, // Only count parent sessions
          },
        }),
      ]);

      const threads = sessions.map((session: any) => ({
        thread_id: session.id,
        title: session.title,
        status: session.status,
        created_at: session.createdAt.toISOString(),
        updated_at: session.updatedAt.toISOString(),
        parent_id: session.parentId,
        children_count: session.childrenCount,
        owner: session.owner,
        problem: (session.analysisData as any)?.problem || {},
        publicScope: session.publicScope || "private",
        hideAuthorName: session.hideAuthorName || false,
      }));

      this.logger.log("User threads retrieved successfully", {
        userId,
        count: threads.length,
        total,
        page,
        pageSize,
      });

      return {
        data: threads,
        meta: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      this.logger.error("Failed to get user threads", {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  async getChildThreads(parentId: string, userId: number): Promise<any> {
    try {
      // Verify parent session exists and belongs to user
      const parentSession = await this.prisma.analysisSession.findFirst({
        where: {
          id: parentId,
          participants: {
            has: userId,
          },
        },
      });

      if (!parentSession) {
        throw new NotFoundException("Parent session not found or access denied");
      }

      // Get child sessions
      const childSessions = await this.prisma.analysisSession.findMany({
        where: {
          parentId: parentId,
          participants: {
            has: userId,
          },
        },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          analysisData: true,
          parentId: true,
          childrenCount: true,
          publicScope: true as any,
          hideAuthorName: true,
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      const threads = childSessions.map((session) => ({
        thread_id: session.id,
        title: session.title,
        status: session.status,
        created_at: session.createdAt.toISOString(),
        updated_at: session.updatedAt.toISOString(),
        parent_id: session.parentId,
        children_count: session.childrenCount,
        owner: session.owner,
        problem: (session.analysisData as any)?.problem || {},
        publicScope: session.publicScope || "private",
        hideAuthorName: session.hideAuthorName || false,
      }));

      this.logger.log("Child threads retrieved successfully", {
        parentId,
        userId,
        count: threads.length,
      });

      return {
        data: threads,
        parent: {
          thread_id: parentSession.id,
          title: parentSession.title,
          status: parentSession.status,
          created_at: parentSession.createdAt.toISOString(),
          updated_at: parentSession.updatedAt.toISOString(),
          children_count: parentSession.childrenCount,
          problem: (parentSession.analysisData as any)?.problem || {},
          publicScope: parentSession.publicScope || "private",
          hideAuthorName: parentSession.hideAuthorName || false,
        },
      };
    } catch (error) {
      this.logger.error("Failed to get child threads", {
        parentId,
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  async getThreadNote(threadId: string, userId: number): Promise<any> {
    try {
      const session = await this.prisma.analysisSession.findFirst({
        where: {
          id: threadId,
          participants: {
            has: userId,
          },
        },
        select: {
          id: true,
          note: true,
          noteUpdatedAt: true,
          noteUpdatedBy: true,
        },
      });

      if (!session) {
        throw new NotFoundException("Thread not found or access denied");
      }

      return {
        thread_id: session.id,
        note: session.note || "",
        note_updated_at: session.noteUpdatedAt?.toISOString() || null,
        note_updated_by: session.noteUpdatedBy || null,
      };
    } catch (error) {
      this.logger.error("Failed to get thread note", {
        threadId,
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  async updateThreadNote(threadId: string, note: string, userId: number): Promise<any> {
    try {
      const session = await this.prisma.analysisSession.findFirst({
        where: {
          id: threadId,
          participants: {
            has: userId,
          },
        },
      });

      if (!session) {
        throw new NotFoundException("Thread not found or access denied");
      }

      const updatedSession = await this.prisma.analysisSession.update({
        where: { id: threadId },
        data: {
          note: note,
          noteUpdatedAt: new Date(),
          noteUpdatedBy: userId,
        },
        select: {
          id: true,
          note: true,
          noteUpdatedAt: true,
          noteUpdatedBy: true,
        },
      });

      this.logger.log("Thread note updated successfully", {
        threadId,
        userId,
        noteLength: note.length,
      });

      return {
        thread_id: updatedSession.id,
        note: updatedSession.note,
        note_updated_at: updatedSession.noteUpdatedAt?.toISOString(),
        note_updated_by: updatedSession.noteUpdatedBy,
      };
    } catch (error) {
      this.logger.error("Failed to update thread note", {
        threadId,
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  async updateFirstAnswer(threadId: string, firstAnswer: string | null, userId: number): Promise<any> {
    try {
      const session = await this.prisma.analysisSession.findFirst({
        where: {
          id: threadId,
          participants: {
            has: userId,
          },
        },
      });

      if (!session) {
        throw new NotFoundException("Thread not found or access denied");
      }

      // Try to update dedicated column if present (ignore error if column doesn't exist)
      try {
        await (this.prisma as any).$executeRawUnsafe(
          'UPDATE analysis_sessions SET first_answer = $1, "updatedAt" = NOW() WHERE id = $2',
          firstAnswer,
          threadId,
        );
      } catch (_) { }

      // Always persist value into analysisData JSON as fallback
      const current = await this.prisma.analysisSession.findUnique({
        where: { id: threadId },
        select: { analysisData: true },
      });

      const analysisData: any = (current?.analysisData as any) || {};
      analysisData.first_answer = firstAnswer ?? null;

      const updatedMeta = await this.prisma.analysisSession.update({
        where: { id: threadId },
        data: {
          analysisData,
          updatedAt: new Date(),
        },
        select: { id: true, updatedAt: true },
      });

      this.logger.log("Thread firstAnswer updated successfully", {
        threadId,
        userId,
        hasFirstAnswer: !!firstAnswer,
      });

      return {
        thread_id: updatedMeta.id,
        first_answer: firstAnswer ?? null,
        updated_at: updatedMeta.updatedAt?.toISOString(),
      };
    } catch (error) {
      this.logger.error("Failed to update thread firstAnswer", {
        threadId,
        userId,
        error: (error as any).message,
      });
      throw error;
    }
  }

  async deleteAnalysisSession(threadId: string, userId: number) {
    const session = await this.prisma.analysisSession.findUnique({
      where: { id: threadId, ownerId: userId },
    });

    if (!session) {
      throw new NotFoundException("Session not found or access denied");
    }

    try {
      return await this.prisma.analysisSession.deleteMany({
        where: {
          OR: [{ id: threadId }, { parentId: threadId }],
        },
      });
    } catch (error) {
      this.logger.error("Failed to delete analysis session", {
        threadId,
        userId,
        error: (error as any).message,
      });
      throw error;
    }
  }

  async getInternalCases(
    userId: number,
    page: number = 1,
    pageSize: number = 10,
    search?: string,
    status?: string,
  ): Promise<any> {
    try {
      const skip = (page - 1) * pageSize;

      // Get current user info for filtering
      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          affiliation: true,
          company: true,
          company_id: true,
        },
      });

      if (!currentUser) {
        throw new NotFoundException("User not found");
      }

      // Build where clause for DB query - optimize by filtering in DB instead of memory
      const whereClause: any = {
        status: status || "completed",
        OR: [
          // Sessions của chính user với publicScope company hoặc group
          {
            ownerId: userId,
            publicScope: {
              in: ["company", "group"],
            },
          },
        ],
      };

      // Add conditions for sessions from other users
      const otherUserConditions: any[] = [];

      // Condition: cùng company và publicScope === "company"
      if (currentUser.company || currentUser.company_id) {
        const companyCondition: any = {
          ownerId: { not: userId },
          publicScope: "company",
          owner: {},
        };

        if (currentUser.company) {
          companyCondition.owner.company = currentUser.company.trim();
        }
        if (currentUser.company_id) {
          companyCondition.owner.company_id = currentUser.company_id;
        }

        otherUserConditions.push(companyCondition);
      }

      // Condition: cùng affiliation và publicScope === "group"
      if (currentUser.affiliation) {
        otherUserConditions.push({
          ownerId: { not: userId },
          publicScope: "group",
          owner: {
            affiliation: currentUser.affiliation.trim(),
          },
        });
      }

      if (otherUserConditions.length > 0) {
        whereClause.OR.push(...otherUserConditions);
      }

      // Query all matching records (filtered by company/affiliation in DB)
      // We'll filter search (including JSON fields) and paginate in memory
      // This is much more efficient than querying ALL completed sessions
      const allMatchingSessions = await this.prisma.analysisSession.findMany({
        where: whereClause,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              full_name: true,
              affiliation: true,
              department: true,
              company: true,
              company_id: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      // Apply search filter for analysisData JSON fields (if search provided)
      // This is needed because Prisma can't easily search in nested JSON fields
      let filteredSessions = allMatchingSessions;
      if (search && search.trim()) {
        const searchLower = search.toLowerCase().trim();
        filteredSessions = allMatchingSessions.filter((session: any) => {
          // Search in title (session title)
          const title = session.title?.toLowerCase() || "";
          const titleMatches = title.includes(searchLower);

          // Search only in problem title (not description)
          const analysisData = session.analysisData as any;
          const problemTitle = analysisData?.problem?.title?.toLowerCase() || "";

          return (
            titleMatches ||
            problemTitle.includes(searchLower)
          );
        });
      }

      // Calculate pagination after filtering
      const total = filteredSessions.length;
      const paginatedSessions = filteredSessions.slice(skip, skip + pageSize);

      const cases = paginatedSessions.map((session: any) => ({
        thread_id: session.id,
        id: session.id,
        title: session.title,
        status: session.status,
        created_at: session.createdAt.toISOString(),
        updated_at: session.updatedAt.toISOString(),
        description: (session.analysisData as any)?.problem?.description || null,
        owner: {
          id: session.owner.id,
          name: session.owner.name,
          email: session.owner.email,
          full_name: session.owner.full_name,
          department: session.owner.department,
          affiliation: session.owner.affiliation,
          company: session.owner.company,
          company_id: session.owner.company_id,
        },
        problem: (session.analysisData as any)?.problem || {},
        publicScope: session.publicScope || "private",
        hideAuthorName: session.hideAuthorName || false,
      }));

      this.logger.log("Internal cases retrieved successfully", {
        userId,
        count: cases.length,
        total,
        page,
        pageSize,
        search,
      });

      return {
        data: cases,
        meta: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      this.logger.error("Failed to get internal cases", {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  async updateVisibilitySettings(
    threadId: string,
    userId: number,
    publicScope: "private" | "group" | "company",
    hideAuthorName: boolean,
  ): Promise<any> {
    try {
      const session = await this.prisma.analysisSession.findFirst({
        where: {
          id: threadId,
          ownerId: userId,
        },
      });

      if (!session) {
        throw new NotFoundException("Thread not found or access denied");
      }

      const updatedSession = await this.prisma.analysisSession.update({
        where: { id: threadId },
        data: {
          publicScope,
          hideAuthorName,
          requiresVisibilityConfig: false as any, // Set to false sau khi cập nhật thành công
          updatedAt: new Date(),
        } as any,
      });

      this.logger.log("Visibility settings updated successfully", {
        threadId,
        userId,
        publicScope,
        hideAuthorName,
      });

      return {
        thread_id: updatedSession.id,
        public_scope: updatedSession.publicScope || "private",
        hide_author_name: updatedSession.hideAuthorName || false,
        updated_at: updatedSession.updatedAt.toISOString(),
      };
    } catch (error) {
      this.logger.error("Failed to update visibility settings", {
        threadId,
        userId,
        error: error.message,
      });
      throw error;
    }
  }
}
