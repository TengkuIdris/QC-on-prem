// ============================================================================
// API-Aligned Types (Based on WhyWhy API Specification)
// ============================================================================

/**
 * Thread status from API
 */
export type ThreadStatus = "running" | "waiting_for_input" | "completed" | "error";

/**
 * Problem severity levels
 */
export type ProblemSeverity = "LOW" | "MEDIUM" | "HIGH";

/**
 * Defect type classifications
 */
export type DefectType = "APPEARANCE" | "DIMENSION" | "FUNCTION" | "MATERIAL" | "STRENGTH" | "DURABILITY" | "OTHER";

/**
 * Occurrence frequency levels
 */
export type OccurrenceFrequency = "FREQUENT" | "OCCASIONAL" | "RARE" | "FIRST_TIME";

/**
 * Investigation record structure
 */
export interface Investigation {
  date?: string; // ISO8601 datetime
  content?: string;
  result?: string;
  investigator?: string;
}

/**
 * Verification information
 */
export interface Verification {
  method?: string;
  result?: string;
  date?: string; // ISO8601 datetime
  verifier?: string;
}

/**
 * Problem input structure (matches API spec)
 */
export interface ThreadProblem {
  title: string;
  product_name?: string;
  occurrence_date?: string; // ISO8601 datetime
  process?: string;
  location?: string;
  severity?: ProblemSeverity;
  description?: string;
  man_details?: string;
  machine_details?: string;
  material_details?: string;
  method_details?: string;
  measurement_details?: string;
  environment_details?: string;
  timeline_analysis?: string;
  defect_types?: DefectType[];
  other_defect_type?: string;
  frequency?: OccurrenceFrequency;
  frequency_percentage?: string;
  investigations?: Investigation[];
  direct_cause?: string;
  verification?: Verification;
  language?: string;
  impact?: string;
}

/**
 * Chat history item type (API format)
 */
export type ChatHistoryType = "human" | "ai";

/**
 * Chat history item from API
 */
export interface ChatHistoryItemAPI {
  type: ChatHistoryType;
  content: string;
}

/**
 * Why node structure from API
 */
export interface WhyNodeAPI {
  id: string;
  name: string;
  level: number;
  parent_id?: string;
  children_ids?: string[];
  supporting_facts?: string;
  is_root_cause?: boolean;
  root_cause_confidence?: number; // 0-1 float
  root_cause_judgement?: string;
  recurrence_prevention_measures?: string;
}

/**
 * Root cause structure from API
 */
export interface RootCauseAPI {
  cause: string;
  confidence: number; // 0-1 float
  judgement_reason: string;
  countermeasures: string;
}

/**
 * One chunk retrieved by the external RAG service.
 * Matches the agent's /retrieve response contract — see
 * `IMPLEMENTATION_SPEC.md` Part A C2. `source_id` for a "case" should be the
 * NestJS case ID so the 「参考事例」 panel can link to InternalCaseDetailView;
 * if the RAG service cannot supply a routable id, the panel degrades to
 * title + snippet without a link.
 */
export interface RetrievedChunk {
  text: string;
  source_type: "case" | "manual";
  source_id?: string;
  title?: string;
  score?: number;
}

/**
 * Thread state structure from API
 */
export interface ThreadState {
  problem?: ThreadProblem;
  chat_history?: ChatHistoryItemAPI[];
  why_nodes?: WhyNodeAPI[];
  root_causes?: RootCauseAPI[];
  retrieved_context?: RetrievedChunk[];
  status?: ThreadStatus;
}

/**
 * Thread response from GET /threads/{id}
 */
export interface ThreadResponse {
  thread_id: string;
  created_at: string; // ISO8601 datetime
  updated_at: string; // ISO8601 datetime
  status: ThreadStatus;
  state?: ThreadState;
  parent_id?: string;
  public_scope?: "private" | "group" | "company";
  hide_author_name?: boolean;
  requires_visibility_config?: boolean;
  owner?: {
    id: number;
    name?: string;
    email?: string;
    full_name?: string;
    affiliation?: string;
    department?: string;
    company?: string;
    company_id?: number;
  };
}

/**
 * Create thread response from POST /threads
 */
export interface CreateThreadResponse {
  thread_id: string;
  created_at: string; // ISO8601 datetime
}

// ============================================================================
// SSE Event Data Payloads (Type-safe discriminated unions)
// ============================================================================

/**
 * SSE event data for final_result
 */
export interface FinalResultData {
  event_type: "final_result";
  thought?: string;
  state: ThreadState;
}

/**
 * SSE event data for info_request
 */
export interface InfoRequestData {
  event_type: "info_request";
  thought?: string;
  state: ThreadState;
}

/**
 * SSE event data for progress updates
 */
export interface ProgressData {
  event_type?: "progress" | "analysis_progress" | "node_updated" | "chat_message";
  thought?: string;
  message?: string;
  percentage?: number;
}

/**
 * SSE event data for errors
 */
export interface ErrorData {
  event_type?: "error" | "analysis_error";
  thought?: string;
  message?: string;
  error?: string;
}

/**
 * SSE event data for analysis state changes
 */
export interface AnalysisEventData {
  event_type?: "analysis_started" | "root_cause_analysis";
  thought?: string;
  message?: string;
}

/**
 * SSE event data for connection lifecycle
 */
export interface ConnectionEventData {
  event_type?: "connection_start" | "connection_end";
}

/**
 * SSE event data for retrieve_context — emitted once early in the run by the
 * agent (between set_initial_cause and joint). `state.retrieved_context`
 * carries the chunks; the rest of the event mirrors other progress events.
 */
export interface RetrieveContextData {
  event_type?: "retrieve_context";
  thought?: string;
  state?: { retrieved_context?: RetrievedChunk[] };
}

/**
 * Generic SSE event data for unknown types
 */
export interface GenericEventData {
  event_type?: string;
  thought?: string;
  [key: string]: unknown;
}

// ============================================================================
// Frontend Domain Types (Normalized/Processed)
// ============================================================================

/**
 * Chat message for UI (normalized from API format)
 */
export interface ChatMessage {
  id: string;
  type: "user" | "ai" | "result" | "error" | "system"; // Normalized: "human" → "user"
  content: string;
  timestamp: string;
  status?: "pending" | "sending" | "sent" | "failed";
  error?: string;
}

/**
 * Why node for UI (normalized from API format)
 * Includes virtual root node and final recommendation nodes
 */
export interface WhyNode {
  id: string;
  name: string;
  level: number;
  parent_id?: string;
  is_root_cause?: boolean;
  children_ids?: string[];
  is_final?: boolean; // Virtual node for recurrence prevention measures
  root_cause_confidence?: number; // 0-1 float
  root_cause_judgement?: string;
  supporting_facts?: string;
  recurrence_prevention_measures?: string;
}

/**
 * Root cause for UI (normalized)
 */
export interface RootCause {
  id?: string;
  cause: string;
  confidence: number; // 0-1 float
  judgement_reason: string;
  countermeasures: string;
}

/**
 * Analysis session metadata
 */
export interface AnalysisSession {
  id: string;
  title: string;
  status: ThreadStatus;
  createdAt: string;
  updatedAt: string;
  owner: string | { id: number; name?: string; email?: string; full_name?: string };
  ownerId?: number;
  analysisData?: ThreadState;
  publicScope?: "private" | "group" | "company";
  hideAuthorName?: boolean;
  requiresVisibilityConfig?: boolean;
}

/**
 * Complete analysis state for the application
 */
import type { NormalizedError } from "@/utils/errorHandling";

export interface AnalysisState {
  session: AnalysisSession | null;
  chatHistory: ChatMessage[];
  analysisNodes: WhyNode[];
  rootCauses?: RootCause[];
  /** Chunks returned by the agent's retrieve_context SSE event. Displayed in the 「参考事例」 panel. */
  retrievedContext?: RetrievedChunk[];
  status: "idle" | "running" | "waiting_for_input" | "completed" | "error" | "connection_end";
  loading: { session: boolean; analysis: boolean; message: boolean };
  ui: {
    hasParent: boolean;
    chatMessage: string;
    hasAutoStarted: boolean;
    isThinking: boolean;
    progressMessage?: string;
    currentThought?: string; // Current AI thought content
    lastThoughtTime?: number; // Timestamp of last thought update
    connectionMessage?: string; // User-facing status when SSE disconnects
    canRetry?: boolean; // Whether the UI should show a retry button
    treeWarning?: string; // Warning when tree data could not be rendered
  };
  lastError?: NormalizedError;
  messageErrorById?: Record<string, NormalizedError>;
}

/**
 * Processed thread data result from data processing utilities
 */
export interface ProcessedThreadData {
  chatHistory: ChatMessage[];
  analysisNodes: WhyNode[];
  session: AnalysisSession;
  rootCauses?: RootCause[];
}

// ============================================================================
// Legacy Types (Redux/Global State - kept for backward compatibility)
// ============================================================================

export interface WhyWhyState {
  currentTree: WhyWhyNode | WhyWhyTree | null;
  savedTrees: WhyWhyNode[] | WhyWhyTree[];
  loading: boolean;
  error: unknown;
}

export interface WhyWhyTree {
  id: string;
  name: string;
  problem: string;
  root: WhyNode | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface WhyWhyNode {
  id: string;
  content: string;
  children: WhyNode[];
  tags: string[];
  root: WhyNode | null;
  createdAt: string;
  updatedAt: string;
}
