import React, { memo } from "react";
import type { WhyNodeViz } from "../WhyWhyTreeVisualization";
import SectionCard from "./components/SectionCard";
import styles from "./NodeDetailDialog.module.css";
import { Dialog, DialogContent } from "@/components/whywhy/ui/dialog";

const NodeDetailDialog = memo(
  ({
    selectedNode,
    onClose,
    onAskQuestion,
    isCompleted,
  }: {
    selectedNode: WhyNodeViz | null;
    onClose: () => void;
    onAskQuestion: (node: WhyNodeViz) => void;
    isCompleted?: boolean;
  }) => {
    return (
      <Dialog
        open={!!selectedNode}
        onOpenChange={(open) => !open && onClose()}
      >
        <DialogContent className={`${styles["container"]} px-6 py-4 !max-w-6xl`}>
          <div className={styles["header"]}>
            <h1>{selectedNode?.name || "N/A"}</h1>
            {/* <p>組み立て設備の不具合 - 分析完了</p> */}
          </div>
          <div className={styles["analysis-sections"]}>
            {/* 支持事実 Section */}
            <SectionCard
              title="支持事実"
              content={selectedNode?.supporting_facts || "N/A"}
              classNameCard={styles["supporting-facts"]}
              icon="🧾"
            />

            {/* AIによる判断理由 Section */}
            <SectionCard
              title="AIによる判断理由"
              content={selectedNode?.root_cause_judgement || "N/A"}
              classNameCard={styles["root-cause"]}
              icon="🎯"
            />

            {/* 再発防止策 Section */}
            <SectionCard
              title="推奨対策案"
              content={selectedNode?.recurrence_prevention_measures || "N/A"}
              classNameCard={styles["prevention-measures"]}
              icon="🛡️"
            />
          </div>

          <div className="flex items-center mt-4 justify-end">
            {selectedNode && !isCompleted && (
              <button
                className={`px-4 py-2 rounded transition-colors ${
                  isCompleted
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                onClick={() => {
                  if (!isCompleted) {
                    onAskQuestion(selectedNode);
                    onClose();
                  }
                }}
                disabled={isCompleted}
              >
                {isCompleted ? "分析完了 - 質問は無効です" : "この原因についてAIに質問"}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  },
);

NodeDetailDialog.displayName = "NodeDetailDialog";

export default NodeDetailDialog;
