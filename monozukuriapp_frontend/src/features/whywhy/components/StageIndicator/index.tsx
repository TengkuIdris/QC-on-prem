import React from "react";

export interface AnalysisStage {
  key: string;
  label: string;
  icon: string;
  color: "blue" | "purple" | "red" | "green";
}

/**
 * Analysis stages for Why-Why analysis workflow
 * Represents the 4 main phases of root cause analysis
 */
export const ANALYSIS_STAGES: AnalysisStage[] = [
  { key: "initial_analysis", label: "初期分析111", icon: "🔍", color: "blue" },
  { key: "deep_analysis", label: "深掘り分析", icon: "⚡", color: "purple" },
  { key: "root_cause_analysis", label: "真因特定", icon: "🎯", color: "red" },
  { key: "countermeasure_planning", label: "対策検討", icon: "✅", color: "green" },
];

interface StageIndicatorProps {
  currentStage?: string;
  completedStages?: string[];
  className?: string;
}

/**
 * StageIndicator Component
 *
 * Displays the current analysis stage with visual progress indication.
 * Features:
 * - 4-stage horizontal progress display
 * - Color-coded stages (blue → purple → red → green)
 * - Scale animation for current stage
 * - Connection lines showing progress flow
 *
 * Desktop-first design for Why-Why analysis workflow.
 */
export const StageIndicator: React.FC<StageIndicatorProps> = ({
  currentStage,
  completedStages = [],
  className = "",
}) => {
  const currentStageIndex = ANALYSIS_STAGES.findIndex((s) => s.key === currentStage);

  const getStageStyle = (stage: AnalysisStage, index: number) => {
    const isActive = stage.key === currentStage;
    const isCompleted = completedStages.includes(stage.key) || index < currentStageIndex;

    const colorMap = {
      blue: {
        active: "bg-blue-600 text-white",
        completed: "bg-blue-100 text-blue-700",
        pending: "bg-gray-100 text-gray-400",
      },
      purple: {
        active: "bg-purple-600 text-white",
        completed: "bg-purple-100 text-purple-700",
        pending: "bg-gray-100 text-gray-400",
      },
      red: {
        active: "bg-red-600 text-white",
        completed: "bg-red-100 text-red-700",
        pending: "bg-gray-100 text-gray-400",
      },
      green: {
        active: "bg-green-600 text-white",
        completed: "bg-green-100 text-green-700",
        pending: "bg-gray-100 text-gray-400",
      },
    };

    const styles = colorMap[stage.color];

    if (isActive) return `${styles.active} shadow-lg scale-105`;
    if (isCompleted) return styles.completed;
    return styles.pending;
  };

  const getConnectorStyle = (index: number) => {
    if (index >= currentStageIndex) return "bg-gray-200";

    const stage = ANALYSIS_STAGES[index];
    const colorMap = {
      blue: "bg-blue-400",
      purple: "bg-purple-400",
      red: "bg-red-400",
      green: "bg-green-400",
    };

    return colorMap[stage.color];
  };

  // Don't render if no current stage is set
  if (!currentStage) return null;

  return (
    <div
      className={`flex items-center justify-between ${className}`}
      role="progressbar"
      aria-label="分析進捗"
      aria-valuenow={currentStageIndex + 1}
      aria-valuemin={1}
      aria-valuemax={ANALYSIS_STAGES.length}
    >
      {ANALYSIS_STAGES.map((stage, index) => (
        <React.Fragment key={stage.key}>
          {/* Stage Card */}
          <div
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300
              ${getStageStyle(stage, index)}
            `}
            aria-current={stage.key === currentStage ? "step" : undefined}
          >
            <span
              className="text-xl"
              aria-hidden="true"
            >
              {stage.icon}
            </span>
            <span className="text-sm font-medium whitespace-nowrap">{stage.label}</span>
          </div>

          {/* Connection Line */}
          {index < ANALYSIS_STAGES.length - 1 && (
            <div
              className={`flex-1 h-1 mx-2 rounded transition-colors duration-300 ${getConnectorStyle(index)}`}
              aria-hidden="true"
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

/**
 * Infer current stage from progress message
 * @param progressMessage - The current progress message
 * @returns The inferred stage key or undefined
 */
export function inferCurrentStage(progressMessage?: string): string | undefined {
  if (!progressMessage) return undefined;

  if (/初期|開始/.test(progressMessage)) return "initial_analysis";
  if (/深掘り|詳細/.test(progressMessage)) return "deep_analysis";
  if (/根本|真因/.test(progressMessage)) return "root_cause_analysis";
  if (/対策|再発防止/.test(progressMessage)) return "countermeasure_planning";

  return undefined;
}
