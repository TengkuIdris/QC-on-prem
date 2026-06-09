import React, { useState } from "react";
import { Brain, Loader2, ChevronDown } from "lucide-react";

interface ThinkingIndicatorProps {
  isThinking: boolean;
  progressMessage?: string;
  currentThought?: string;
  className?: string;
}

/**
 * ThinkingIndicator Component
 *
 * Displays AI's current thinking process during analysis.
 * Features:
 * - Real-time thought content display
 * - Collapsible long thoughts (>150 chars)
 * - Progress message inference
 * - Accessible with ARIA attributes
 *
 * Desktop-first design optimized for Why-Why analysis workflow.
 */
export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  isThinking,
  progressMessage,
  currentThought,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false); // Default to collapsed

  if (!isThinking) return null;

  const shouldShowThought = currentThought && currentThought.length > 0;
  const isLongThought = currentThought && currentThought.length > 60; // Lower threshold (150 -> 60)

  return (
    <div
      className={`flex items-start space-x-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm transition-all ${className}`}
      role="status"
      aria-live="polite"
      aria-label={progressMessage ?? "AIが分析中"}
    >
      {/* Icon Area */}
      <div className="flex-shrink-0">
        <Brain className="w-5 h-5 text-blue-600 animate-pulse" />
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        {/* Status Line */}
        <div className="flex items-center space-x-2 mb-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-sm font-medium text-blue-800">{progressMessage || "AIが分析中..."}</span>
        </div>

        {/* Thought Content */}
        {shouldShowThought && (
          <div className="bg-white rounded border-l-4 border-blue-400 shadow-inner overflow-hidden">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-between w-full px-3 py-2 text-left bg-white hover:bg-blue-50 transition-colors"
              aria-expanded={isExpanded}
              aria-controls="thought-content"
              type="button"
            >
              <span className="text-sm font-medium text-blue-800">💭 AIの思考プロセス</span>
              {isLongThought && (
                <ChevronDown
                  className={`w-4 h-4 text-blue-600 transition-transform duration-200 ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              )}
            </button>

            <div
              id="thought-content"
              className={`px-3 pb-3 text-sm text-blue-700 leading-relaxed whitespace-pre-wrap transition-all duration-200 ${
                !isExpanded && isLongThought ? "line-clamp-2" : ""
              }`}
            >
              {currentThought}
            </div>

            {!isExpanded && isLongThought && (
              <button
                onClick={() => setIsExpanded(true)}
                className="px-3 pb-2 text-xs text-blue-600 hover:text-blue-800 hover:underline bg-white"
                type="button"
              >
                続きを読む
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
