import type {
  ChatMessage,
  ChatHistoryItemAPI,
  WhyNode,
  WhyNodeAPI,
  ThreadResponse,
  ThreadState,
  AnalysisSession,
  ProcessedThreadData,
  RootCause,
  RootCauseAPI,
} from "../types";

const ROOT_NODE_ID = "root";
const ROOT_FALLBACK_TITLE = "問題";
const MAX_NODE_PARSE_WARNINGS = 3;

const toArray = (nodes?: ThreadState["why_nodes"]): WhyNodeAPI[] => {
  if (!nodes) return [];
  const values = Array.isArray(nodes) ? nodes : Object.values(nodes);
  let parseWarnings = 0;

  const hydrate = (entry: unknown): WhyNodeAPI | null => {
    if (!entry) return null;

    if (typeof entry === "string") {
      try {
        const parsed = JSON.parse(entry);
        if (parsed && typeof parsed === "object") {
          return parsed as WhyNodeAPI;
        }
        return null;
      } catch (error) {
        if (parseWarnings < MAX_NODE_PARSE_WARNINGS) {
          console.warn("Failed to parse why_node entry:", entry, error);
        }
        parseWarnings += 1;
        return null;
      }
    }

    if (typeof entry === "object") {
      return entry as WhyNodeAPI;
    }

    return null;
  };

  return values.map(hydrate).filter((node): node is WhyNodeAPI => !!node);
};

const stableHash = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // eslint-disable-line no-bitwise -- simple string hash
  }
  return Math.abs(hash).toString(36);
};

const createSignature = (type: string, content: string, index: number): string => `${type}::${index}::${content}`;

/**
 * Maps API chat history format to UI chat message format while ignoring thought traces.
 * Preserves order and provides content-based stable IDs so optimistic messages can reconcile.
 */
export function processChatHistory(chatHistory?: ChatHistoryItemAPI[]): ChatMessage[] {
  if (!Array.isArray(chatHistory)) {
    console.warn("Invalid chatHistory format:", chatHistory);
    return [];
  }

  const timestamp = new Date().toISOString();

  try {
    return chatHistory
      .filter(
        (item): item is ChatHistoryItemAPI =>
          !!item && (item.type === "human" || item.type === "ai") && typeof item.content === "string",
      )
      .map((item, index) => {
        const signature = createSignature(item.type, item.content, index);
        return {
          id: `server-${stableHash(signature)}`,
          type: item.type === "human" ? "user" : "ai",
          content: item.content,
          timestamp,
          status: "sent" as const,
        };
      });
  } catch (error) {
    console.error("Error processing chat history:", error);
    return [];
  }
}

/**
 * Normalizes API why_nodes to UI WhyNode format.
 * - Creates virtual root node with problem title.
 * - Links level-1 nodes to the virtual root if missing.
 * - Creates virtual "final" nodes tied to root causes with recurrence prevention measures.
 */
export function normalizeWhyNodes(state?: ThreadState): WhyNode[] {
  const parentNode: WhyNode = {
    id: ROOT_NODE_ID,
    name: state?.problem?.title || ROOT_FALLBACK_TITLE,
    level: 0,
    children_ids: [],
  };

  if (!state?.why_nodes) {
    console.warn("No why_nodes found in state");
    return [parentNode];
  }

  const rawNodes = toArray(state.why_nodes).filter(
    (node): node is WhyNodeAPI =>
      !!node && typeof node.id === "string" && typeof node.name === "string" && typeof node.level === "number",
  );

  if (rawNodes.length === 0) {
    console.warn("No valid nodes found after filtering");
    return [parentNode];
  }

  const childrenMap = new Map<string, Set<string>>();

  const normalized = rawNodes.map((node) => {
    const normalizedNode: WhyNode = {
      ...node,
      children_ids: Array.isArray(node.children_ids) ? [...node.children_ids] : [],
    };

    if (normalizedNode.level === 1 && !normalizedNode.parent_id) {
      normalizedNode.parent_id = parentNode.id;
    }

    childrenMap.set(normalizedNode.id, new Set(normalizedNode.children_ids ?? []));
    return normalizedNode;
  });

  parentNode.children_ids = Array.from(new Set(normalized.filter((node) => node.level === 1).map((node) => node.id)));

  const finalNodes: WhyNode[] = normalized
    .filter((node) => node.is_root_cause === true)
    .map((node) => {
      const finalId = `final-${node.id}`;
      const parentChildren = childrenMap.get(node.id) ?? new Set<string>();
      parentChildren.add(finalId);
      childrenMap.set(node.id, parentChildren);

      return {
        ...node,
        id: finalId,
        parent_id: node.id,
        is_root_cause: false,
        is_final: true,
        level: (node.level ?? 0) + 1,
        name: "推奨対策案",
        children_ids: [],
      };
    });

  const nodesWithLinkedChildren = normalized.map((node) => {
    const children = childrenMap.get(node.id);
    return children ? { ...node, children_ids: Array.from(children) } : node;
  });

  return [parentNode, ...nodesWithLinkedChildren, ...finalNodes];
}

/**
 * Maps root causes from API format to UI format.
 */
export function mapRootCauses(rootCauses?: RootCauseAPI[]): RootCause[] {
  if (!Array.isArray(rootCauses)) return [];
  return rootCauses.map((rc, index) => ({
    id: `root-cause-${stableHash(`${index}-${rc?.cause ?? ""}-${rc?.judgement_reason ?? ""}`)}`,
    cause: rc.cause,
    confidence: rc.confidence,
    judgement_reason: rc.judgement_reason,
    countermeasures: rc.countermeasures,
  }));
}

/**
 * Maps thread response to session metadata.
 */
export function mapSessionData(thread: ThreadResponse): AnalysisSession {
  const owner = thread.owner || "Current User";
  const mapped = {
    id: thread.thread_id,
    title: thread.state?.problem?.title || "Untitled",
    status: thread.status,
    createdAt: thread.created_at,
    updatedAt: thread.updated_at,
    owner: typeof owner === "object" ? (owner as any) : owner,
    ownerId: typeof owner === "object" ? owner.id : undefined,
    analysisData: thread.state,
    publicScope: thread.public_scope || "private",
    hideAuthorName: thread.hide_author_name ?? false,
    requiresVisibilityConfig: thread.requires_visibility_config ?? false,
  };
  console.log("[mapSessionData] Mapping session data", {
    thread_id: thread.thread_id,
    owner_type: typeof owner,
    owner_object: owner,
    ownerId: mapped.ownerId,
    requires_visibility_config: thread.requires_visibility_config,
    requiresVisibilityConfig: mapped.requiresVisibilityConfig,
  });
  return mapped;
}

/**
 * Processes complete thread data from API into UI format.
 */
export function processThreadData(thread: ThreadResponse): ProcessedThreadData {
  return {
    chatHistory: processChatHistory(thread?.state?.chat_history),
    analysisNodes: normalizeWhyNodes(thread?.state),
    session: mapSessionData(thread),
    rootCauses: mapRootCauses(thread?.state?.root_causes),
  };
}
