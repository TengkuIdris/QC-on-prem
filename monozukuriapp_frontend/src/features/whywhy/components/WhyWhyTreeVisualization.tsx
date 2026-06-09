import React, { useMemo } from "react";
import { ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";
import "./WhyWhyTreeVisualization.css";
import WhyWhyTreeVisualizationInner from "./WhyWhyTreeVisualizationInner";

export interface WhyNodeViz {
  id: string;
  name: string;
  level: number;
  parent_id?: string;
  is_root_cause?: boolean;
  root_cause_confidence?: number;
  root_cause_judgement?: string;
  supporting_facts?: string;
  recurrence_prevention_measures?: string;
  is_final?: boolean; // Virtual node for recurrence prevention measures display
  layoutOptions?: Record<string, string>;
}

export interface RootCauseViz {
  id: string;
  node_id: string;
  confidence?: number;
}

export interface WhyWhyTreeVisualizationProps {
  nodes: WhyNodeViz[];
  rootCauses?: RootCauseViz[];
  className?: string;
  onAskNodeQuestion?: (node: WhyNodeViz) => void;
  isCompleted?: boolean;
  interactionsDisabled?: boolean;
  edgeTypeOverride?: "step" | "smoothstep" | "straight";
  exportMode?: boolean; // khi true: tối ưu cho xuất PDF
}

export const WhyWhyTreeVisualization: React.FC<WhyWhyTreeVisualizationProps> = (props) => {
  const key = useMemo(() => {
    const k = props.nodes?.length && props.nodes[0]?.id ? props.nodes[0].id.split("-")[0] : "default";
    return `${k}-${props.nodes?.length || 0}`;
  }, [props.nodes]);

  return (
    <ReactFlowProvider key={key}>
      <WhyWhyTreeVisualizationInner {...props} />
    </ReactFlowProvider>
  );
};
