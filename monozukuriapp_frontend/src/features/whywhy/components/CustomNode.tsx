import React, { memo } from "react";
import type { WhyNodeViz } from "./WhyWhyTreeVisualization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/whywhy/ui/card";
import { Badge } from "@/components/whywhy/ui/badge";
import { TreePine, Target } from "lucide-react";
import { Position, Handle } from "reactflow";

const CustomNode = memo(({ data }: { data: WhyNodeViz }) => {
  const isRootCause = !!data.is_root_cause;
  const isFinal = !!data.is_final;

  // Generate accessible labels for the node
  const nodeTypeLabel = isFinal ? "推奨対策案" : isRootCause ? "根本原因" : "分析ノード";
  const confidenceLabel = data.root_cause_confidence
    ? `確信度 ${Math.round(data.root_cause_confidence * 100)} パーセント`
    : "";
  const levelLabel = data.level > 0 ? `レベル ${data.level}` : "";
  const nodeAriaLabel = `${nodeTypeLabel}、${data.name}${confidenceLabel ? `、${confidenceLabel}` : ""}${levelLabel ? `、${levelLabel}` : ""}`;

  return (
    <div style={{ position: "relative" }}>
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{
          background: "#64748b",
          width: 8,
          height: 8,
          border: "2px solid white",
        }}
      />
      {isFinal ? (
        <Card
          className={`why-why-node normal !bg-[#cdffff] !shadow-[unset]`}
          role="article"
          aria-label={nodeAriaLabel}
        >
          <CardHeader className="p-3">
            <CardTitle className="flex items-start gap-2 text-sm">
              <p className="font-semibold text-gray-900 break-words leading-snug">推奨対策案</p>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 text-xs space-y-2">
            <div className="whitespace-pre-wrap">{data?.recurrence_prevention_measures || ""}</div>
          </CardContent>
        </Card>
      ) : (
        <Card
          className={`why-why-node ${isRootCause ? "root-cause" : "normal"} !shadow-[unset]`}
          role="article"
          aria-label={nodeAriaLabel}
        >
          <CardHeader className="p-3">
            <CardTitle className="flex items-start gap-2 text-sm">
              {isRootCause ? (
                <Target
                  className={`why-why-node-icon root-cause shrink-0`}
                  style={{ flexShrink: 0 }}
                />
              ) : (
                <TreePine
                  className={`why-why-node-icon normal shrink-0`}
                  style={{ flexShrink: 0 }}
                />
              )}
              <p className="font-semibold text-gray-900 leading-snug min-w-0 break-words whitespace-normal">
                {data.name}
              </p>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 text-xs space-y-2">
            {isRootCause && (
              <div>
                <Badge
                  className="why-why-badge root-cause z-[50]"
                  aria-label="根本原因"
                >
                  根本原因
                </Badge>
              </div>
            )}
            {data.level > 0 && (
              <Badge
                className="why-why-badge level"
                aria-label={`レベル ${data.level}`}
              >
                レベル {data.level}
              </Badge>
            )}
            {data.root_cause_confidence && (
              <Badge
                className="ml-1 why-why-badge level"
                aria-label={`確信度 ${Math.round(data.root_cause_confidence * 100)} パーセント`}
              >
                確信度 {Math.round(data.root_cause_confidence * 100)}％
              </Badge>
            )}
            {data.supporting_facts && (
              <div
                className="why-why-supporting-facts"
                role="region"
                aria-label="支持事実"
              >
                <div className="why-why-supporting-facts-label">支持事実:</div>
                <div className="why-why-supporting-facts-text min-w-0 break-words whitespace-normal">
                  {data.supporting_facts}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{
          background: "#64748b",
          width: 8,
          height: 8,
          border: "2px solid white",
        }}
      />
    </div>
  );
});

CustomNode.displayName = "CustomNode";

export default CustomNode;
