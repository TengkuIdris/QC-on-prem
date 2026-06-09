import { z } from "zod";
import { ProblemInput, ProblemInputSchema } from "./problem";

// Represents a single node in the Why-Why analysis tree
export const WhyNodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number().int(),
  parent_id: z.string().optional().nullable(),
  children_ids: z.array(z.string()),
  supporting_facts: z.string(),
  is_root_cause: z.boolean(),
  root_cause_confidence: z.number().optional().nullable(),
  root_cause_judgement: z.string(),
  recurrence_prevention_measures: z.string(),
});
export type WhyNode = z.infer<typeof WhyNodeSchema>;

// Represents a root cause identified by the analysis
export const RootCauseSchema = z.object({
  cause: z.string(),
  confidence: z.number(),
  judgement_reason: z.string(),
  countermeasures: z.string(),
});
export type RootCause = z.infer<typeof RootCauseSchema>;

// Represents the state of the chat history
export const ChatMessageSchema = z.object({
  type: z.enum(["human", "ai"]),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// Represents the entire state of an analysis, often nested within a Session
export const AnalysisDataSchema = z.object({
  id: z.string(),
  status: z.enum(["not_started", "running", "waiting_for_input", "completed", "error", "connection_end"]),
  problem: ProblemInputSchema, // problem object is part of the analysis data
  chat_history: z.array(ChatMessageSchema),
  why_nodes: z.union([
    z.array(WhyNodeSchema),
    z.record(z.string(), z.string()), // AI service sends why_nodes as { "node_id:node_data" }
  ]),
  root_causes: z.array(RootCauseSchema),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});
export type AnalysisData = z.infer<typeof AnalysisDataSchema>;

// For Server-Sent Events (SSE)
export const SSEEventSchema = z.object({
  event_type: z.string(),
  thought: z.string().optional(),
  state: z
    .object({
      problem: ProblemInputSchema.partial().optional(),
      chat_history: z.array(ChatMessageSchema).optional(),
      why_nodes: z.union([z.array(WhyNodeSchema), z.record(z.string(), z.string())]).optional(),
      root_causes: z.array(RootCauseSchema).optional(),
    })
    .optional()
    .nullable(), // The full analysis state can be sent or null
});
export type SSEEvent = z.infer<typeof SSEEventSchema>;

// AI Agent actions
export enum AnalysisAction {
  INITIAL_ANALYSIS = "initial_analysis",
  DEEP_ANALYSIS = "deep_analysis",
  INFO_REQUEST = "info_request",
  ROOT_CAUSE_ANALYSIS = "root_cause_analysis",
  CONNECTION_END = "connection_end",
}

export const AnalysisRequestSchema = z.object({
  session_id: z.string(),
  action: z.nativeEnum(AnalysisAction),
  target_node_id: z.string().optional(),
  user_response: z.string().optional(),
});

export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;
