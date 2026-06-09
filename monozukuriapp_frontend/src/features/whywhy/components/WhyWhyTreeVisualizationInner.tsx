import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Connection,
  ConnectionLineType,
  Controls,
  Edge,
  Node,
  ReactFlowInstance,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "reactflow";
import type { WhyNodeViz, WhyWhyTreeVisualizationProps } from "./WhyWhyTreeVisualization";
import CustomNode from "./CustomNode";
import { useTreeLayout } from "@/hooks/useTreeLayout";
import NodeDetailDialog from "./NodeDetailDialog";
import EmptyTreeState from "./EmptyTreeState";

let elk: any = null;

// Layout configuration constants
const LAYOUT_CONFIG = {
  NODE_LAYER_SPACING: 200,
  SPACING_MULTIPLIER: 80,
  CHARS_PER_SPACING_UNIT: 100,
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 2,
  WIDTH: 300,
  HEIGHT: 140,
} as const;

const ELK_OPTIONS = {
  "elk.algorithm": "layered",
  "elk.layered.spacing.nodeNodeBetweenLayers": LAYOUT_CONFIG.NODE_LAYER_SPACING.toString(),
  "elk.direction": "RIGHT",
  "elk.layered.nodePlacement.linearSegments.deflectionDampening": "0.1",
  "elk.layered.nodePlacement.favorStraightEdges": true,
  "elk.layered.edgeRouting": "POLYLINE",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  "elk.layered.considerModelOrder.crossingCounterNodeInfluence": 1.0,
  "elk.spacing.componentComponent": "100",
  "elk.separateConnectedComponents": "true",
} as const;

const getLayoutedElements = async (
  nodes: Node[],
  edges: Edge[],
  options = {},
): Promise<{ nodes: Node[]; edges: Edge[] } | undefined> => {
  // Dynamically import ELK to prevent initialization errors
  if (!elk) {
    try {
      const ELKModule = await import("elkjs/lib/elk.bundled.js");
      const ELK = ELKModule.default || ELKModule;
      elk = new ELK();
    } catch (error) {
      console.error("Failed to load ELK library:", error);
      return undefined;
    }
  }
  const getNodeHeight = (node: Node) => {
    const data: any = node.data || {};

    // Heuristic text height estimator based on node width and typical font size
    const CARD_HORIZONTAL_PADDING = 24; // px (Card paddings and borders)
    const CONTENT_WIDTH = LAYOUT_CONFIG.WIDTH - CARD_HORIZONTAL_PADDING;
    const AVG_CHAR_WIDTH = 9; // px (rough average for small text)
    const CHARS_PER_LINE = Math.max(10, Math.floor(CONTENT_WIDTH / AVG_CHAR_WIDTH));
    const LINE_HEIGHT = 18; // px
    const headerHeight = 40; // title area
    const badgesHeight = !data?.is_final ? 40 : 0;
    const paddingAndMargins = 24; // inner paddings/spacings
    const nameText = typeof data?.name === "string" ? data.name : "";
    const factsText = typeof data?.supporting_facts === "string" ? data.supporting_facts : "";
    const judgementText = typeof data?.root_cause_judgement === "string" ? data.root_cause_judgement : "";
    const textForHeight = data?.is_final ? judgementText : `${nameText}\n${factsText}`;
    // Count lines respecting explicit newlines and wrapping per line
    const wrappedLines = (textForHeight || "").split("\n").reduce((sum: number, line: string) => {
      const len = line.length;
      const linesForThis = Math.max(1, Math.ceil(len / CHARS_PER_LINE));
      return sum + linesForThis;
    }, 0);
    const textHeight = wrappedLines * LINE_HEIGHT;
    const base = headerHeight + badgesHeight + paddingAndMargins;
    const estimated = base + textHeight;
    const minForNode = data?.is_final ? 140 : LAYOUT_CONFIG.HEIGHT;
    return Math.max(minForNode, estimated);
  };
  const graph = {
    id: "root",
    layoutOptions: options,
    children: nodes.map((node) => ({
      ...node,
      targetPosition: "left",
      sourcePosition: "right",
      width: LAYOUT_CONFIG.WIDTH,
      height: getNodeHeight(node),
    })),
    edges: edges,
  };

  try {
    if (!elk) {
      console.warn("ELK not initialized, using fallback layout");
      return {
        nodes: nodes.map((node, index) => ({
          ...node,
          position: { x: index * 350, y: 0 },
        })),
        edges: edges,
      };
    }

    const layoutedGraph = await elk.layout(graph as any);
    return {
      nodes: layoutedGraph?.children
        ? layoutedGraph.children.map((node) => ({
            ...node,
            position: { x: node.x || 0, y: node.y || 0 },
          }))
        : [],
      edges: layoutedGraph.edges || [],
    };
  } catch (error) {
    console.error("Layout error:", error);

    // Fallback: provide basic layout to prevent ReactFlow from crashing
    return {
      nodes: nodes.map((node, index) => ({
        ...node,
        position: { x: index * 350, y: 0 },
      })),
      edges: edges,
    };
  }
};

const nodeTypes = { custom: CustomNode };

export default function WhyWhyTreeVisualizationInner({
  nodes: rawNodes,
  className = "",
  onAskNodeQuestion,
  isCompleted,
  interactionsDisabled,
  edgeTypeOverride,
  exportMode,
}: Omit<WhyWhyTreeVisualizationProps, "rootCauses">) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = React.useState<WhyNodeViz | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<any, any>>();
  const { fitView } = useReactFlow();
  const isMountedRef = useRef(true);

  const { initialNodes, initialEdges } = useTreeLayout(rawNodes || []);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      setSelectedNode(null);
    };
  }, []);

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (node.id === "root") return;
      if (!isMountedRef.current || interactionsDisabled) return;

      if (node.type === "custom" && node.data && node.data.level !== 0) {
        setSelectedNode(node.data as WhyNodeViz);
      }
    },
    [interactionsDisabled],
  );

  const handleAskQuestion = useCallback(
    (node: WhyNodeViz) => {
      if (onAskNodeQuestion && isMountedRef.current && !interactionsDisabled) {
        onAskNodeQuestion(node);
      }
    },
    [onAskNodeQuestion, interactionsDisabled],
  );

  const handleCloseDialog = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const calculateDynamicSpacing = useCallback((nodes: Node[]) => {
    const maxSupportingFactsLength = Math.max(...nodes.map((node) => node.data?.supporting_facts?.length || 0));

    return (maxSupportingFactsLength / LAYOUT_CONFIG.CHARS_PER_SPACING_UNIT) * LAYOUT_CONFIG.SPACING_MULTIPLIER;
  }, []);

  const onLayout = useCallback(async () => {
    const dynamicSpacing = Math.floor(calculateDynamicSpacing(initialNodes));
    const layoutOptions = {
      ...ELK_OPTIONS,
      "elk.spacing.nodeNode": dynamicSpacing.toString(),
      // "elk.spacing.nodeNode": "200",
    };

    try {
      const result = await getLayoutedElements(initialNodes, initialEdges, layoutOptions);
      if (result && result.nodes && result.nodes.length > 0 && isMountedRef.current) {
        setNodes(result.nodes);
        setEdges(result.edges);
        fitView();
      } else {
        console.warn("Layout result is empty or invalid, using fallback");
        // Fallback: use initial nodes with basic positioning
        const fallbackNodes = initialNodes.map((node, index) => ({
          ...node,
          position: { x: index * 350, y: 0 },
        }));
        setNodes(fallbackNodes);
        setEdges(initialEdges);
      }
    } catch (error) {
      console.error("Failed to layout nodes:", error);
      // Fallback: use initial nodes with basic positioning
      const fallbackNodes = initialNodes.map((node, index) => ({
        ...node,
        position: { x: index * 350, y: 0 },
      }));
      setNodes(fallbackNodes);
      setEdges(initialEdges);
    }
  }, [initialNodes, initialEdges, calculateDynamicSpacing, setNodes, setEdges, fitView]);

  useEffect(() => {
    if (reactFlowInstance && interactionsDisabled) {
      reactFlowInstance.fitView();
    }
  }, [reactFlowInstance, nodes, edges]);

  // Calculate the initial layout on mount.
  useLayoutEffect(() => {
    onLayout();
  }, []);

  if (!rawNodes || rawNodes.length === 0) {
    return <EmptyTreeState />;
  }

  return (
    <div className={`why-why-tree-container ${className}`}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onConnect={onConnect}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionLineType={
          edgeTypeOverride === "step"
            ? ConnectionLineType.Step
            : edgeTypeOverride === "straight"
              ? ConnectionLineType.Straight
              : ConnectionLineType.SmoothStep
        }
        fitView
        onNodeClick={handleNodeClick}
        onlyRenderVisibleElements
        minZoom={LAYOUT_CONFIG.MIN_ZOOM}
        maxZoom={LAYOUT_CONFIG.MAX_ZOOM}
        panOnDrag={!interactionsDisabled && !exportMode}
        panOnScroll={false}
        zoomOnScroll={!interactionsDisabled && !exportMode}
        zoomOnPinch={!interactionsDisabled && !exportMode}
        zoomOnDoubleClick={!interactionsDisabled && !exportMode}
        nodesDraggable={!interactionsDisabled && !exportMode}
        nodesConnectable={!interactionsDisabled && !exportMode}
        elementsSelectable={!interactionsDisabled && !exportMode}
        defaultEdgeOptions={exportMode ? { style: { strokeWidth: 2.25, stroke: "#475569" } } : undefined}
        onInit={(instance) => {
          setReactFlowInstance(instance);
        }}
      >
        {!interactionsDisabled && !exportMode && <Controls />}
        {!exportMode && <Background />}
      </ReactFlow>
      <NodeDetailDialog
        selectedNode={selectedNode}
        onClose={handleCloseDialog}
        onAskQuestion={handleAskQuestion}
        isCompleted={isCompleted}
      />
    </div>
  );
}
