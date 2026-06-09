import type { WhyNodeViz } from "@/features/whywhy/components/WhyWhyTreeVisualization";
import { useMemo } from "react";
import { Edge, Node, Position } from "reactflow";

export const useTreeLayout = (rawNodes: WhyNodeViz[]) => {
  return useMemo(() => {
    if (!rawNodes || rawNodes.length === 0) return { initialNodes: [] as Node[], initialEdges: [] as Edge[] };

    const nodesByLevel: Record<number, WhyNodeViz[]> = {};
    rawNodes.forEach((n) => {
      const lvl = typeof n?.level === "number" ? n.level : 0;
      if (!nodesByLevel[lvl]) nodesByLevel[lvl] = [];
      nodesByLevel[lvl].push(n);
    });

    const initialNodes: Node[] = [];
    Object.keys(nodesByLevel).forEach((lvlStr) => {
      const lvl = parseInt(lvlStr);
      const list = nodesByLevel[lvl];
      list?.forEach((n) => {
        initialNodes.push({
          id: n?.id,
          type: "custom",
          data: n,
          position: { x: 0, y: 0 },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });
      });
    });

    const initialEdges: Edge[] = rawNodes
      .filter((n) => {
        if (!n?.parent_id) return false;
        const parentExists = rawNodes.find((p) => p?.id === n?.parent_id);
        return !!parentExists;
      })
      .map((n) => ({
        id: `edge-${n?.parent_id}-${n?.id}`,
        source: n?.parent_id!,
        target: n?.id,
        sourceHandle: "right",
        targetHandle: "left",
        type: "smoothstep",
        animated: true,
        style: {
          strokeWidth: 2,
          stroke: "#64748b",
        },
      }));

    return { initialNodes, initialEdges };
  }, [rawNodes]);
};
