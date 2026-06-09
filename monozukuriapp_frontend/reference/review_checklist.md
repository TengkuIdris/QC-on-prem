`thought`を適切に表示してUXを向上させる方法を分析します。現在の実装では`thought`イベントが抑制されているため、ユーザーに有用な情報が表示されていません。


[2 tools called]

## 🎯 **`thought`を適切に表示してUXを向上させる方法**

現在の実装では`thought`イベントが抑制されているため、ユーザーに有用な情報が表示されていません。以下に改善策を提案します。

## 🚨 **現在の問題点**

### 1. **`thought`イベントの完全抑制**
```typescript
// useAnalysisState.ts:122-125
if (kind === "thought" || typeof payload.thought === "string") {
  console.debug("[SSE] Thought event suppressed");
  return; // ← ここで完全に無視している
}
```

### 2. **限定的なプログレスメッセージ**
```typescript
// useAnalysisState.ts:24-28
const PROGRESS_COPY: Record<string, string> = {
  analysis_started: "分析を開始しています...",
  root_cause_analysis: "根本原因を特定中...",
  deep_analysis: "詳細分析を実施中...",
};
```

## 🚀 **UX向上のための改善策**

### **1. `thought`イベントの活用**

```typescript
// useAnalysisState.ts の updateFromSSE 関数を修正
const updateFromSSE = useCallback(
  (kind: string, data: unknown, options?: { source?: "message" | "stream-end" }) => {
    console.log('[updateFromSSE] Received event:', { kind, hasData: !!data, source: options?.source });

    if (!data) {
      console.warn('[updateFromSSE] No data received, skipping');
      return;
    }

    const payload = data as { state?: ThreadState; thought?: string; message?: string };

    // thought イベントを適切に処理
    if (kind === "thought" || payload.thought) {
      console.log('[updateFromSSE] Processing thought event:', payload.thought);
      
      setState((prev) => ({
        ...prev,
        ui: { 
          ...prev.ui, 
          isThinking: true, 
          progressMessage: payload.thought || "AIが考えています..." 
        },
        loading: { ...prev.loading, analysis: true }
      }));
      return;
    }

    // 既存の処理...
  },
  [sessionId],
);
```

### **2. リアルタイム思考プロセスの表示**

```typescript
// 新しい型定義を追加
export interface ThoughtMessage {
  id: string;
  type: "thought";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

// AnalysisState に thought を追加
export interface AnalysisState {
  session: AnalysisSession | null;
  chatHistory: ChatMessage[];
  analysisNodes: WhyNode[];
  rootCauses?: RootCause[];
  status: "idle" | "running" | "waiting_for_input" | "completed" | "error" | "connection_end";
  loading: { session: boolean; analysis: boolean; message: boolean };
  ui: { 
    hasParent: boolean; 
    chatMessage: string; 
    hasAutoStarted: boolean; 
    isThinking: boolean; 
    progressMessage?: string;
    currentThought?: string; // ← 追加
  };
  lastError?: NormalizedError;
  messageErrorById?: Record<string, NormalizedError>;
}
```

### **3. 思考プロセス表示コンポーネント**

```typescript
// components/ThinkingIndicator.tsx
import React from 'react';
import { Brain, Loader2 } from 'lucide-react';

interface ThinkingIndicatorProps {
  isThinking: boolean;
  progressMessage?: string;
  currentThought?: string;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  isThinking,
  progressMessage,
  currentThought
}) => {
  if (!isThinking) return null;

  return (
    <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex-shrink-0">
        <Brain className="w-5 h-5 text-blue-600 animate-pulse" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2 mb-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            {progressMessage || "AIが分析中..."}
          </span>
        </div>
        {currentThought && (
          <div className="text-sm text-blue-700 bg-white p-2 rounded border-l-2 border-blue-300">
            <div className="font-medium mb-1">思考プロセス:</div>
            <div className="whitespace-pre-wrap">{currentThought}</div>
          </div>
        )}
      </div>
    </div>
  );
};
```

### **4. チャット履歴に思考プロセスを統合**

```typescript
// useAnalysisState.ts の updateFromSSE を修正
const updateFromSSE = useCallback(
  (kind: string, data: unknown, options?: { source?: "message" | "stream-end" }) => {
    // ... 既存の処理 ...

    // thought イベントをチャット履歴に追加
    if (kind === "thought" || payload.thought) {
      const thoughtMessage: ChatMessage = {
        id: `thought-${Date.now()}`,
        type: "ai",
        content: payload.thought || "AIが考えています...",
        timestamp: new Date().toISOString(),
        status: "sent"
      };

      setState((prev) => ({
        ...prev,
        chatHistory: [...prev.chatHistory, thoughtMessage],
        ui: { 
          ...prev.ui, 
          isThinking: true, 
          currentThought: payload.thought,
          progressMessage: "思考中..." 
        },
        loading: { ...prev.loading, analysis: true }
      }));
      return;
    }

    // 既存の処理...
  },
  [sessionId],
);
```

### **5. 段階的なプログレス表示**

```typescript
// より詳細なプログレスメッセージ
const PROGRESS_COPY: Record<string, string> = {
  analysis_started: "分析を開始しています...",
  root_cause_analysis: "根本原因を特定中...",
  deep_analysis: "詳細分析を実施中...",
  initial_analysis: "初期分析を実行中...",
  deep_analysis: "深掘り分析を実施中...",
  info_request: "追加情報を確認中...",
  root_cause_analysis: "真因を特定中...",
  thought: "AIが思考中...",
};

// 思考プロセスの段階表示
const getThoughtProgress = (thought: string): string => {
  if (thought.includes("なぜ")) return "原因を分析中...";
  if (thought.includes("根本")) return "根本原因を特定中...";
  if (thought.includes("対策")) return "対策を検討中...";
  return "AIが思考中...";
};
```

### **6. アニメーション付きの思考表示**

```typescript
// components/ThinkingAnimation.tsx
import React, { useState, useEffect } from 'react';

interface ThinkingAnimationProps {
  message: string;
  isActive: boolean;
}

export const ThinkingAnimation: React.FC<ThinkingAnimationProps> = ({ 
  message, 
  isActive 
}) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="flex items-center space-x-2 text-blue-600">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
      <span className="text-sm font-medium">
        {message}{dots}
      </span>
    </div>
  );
};
```

### **7. 統合されたUX改善**

```typescript
// WhyWhyAnalysisView/index.tsx の修正
{/* Loading indicator for new messages */}
{(derived.isStarting || derived.isSending || isLoadingSSE || derived.isThinking) && !isInitialLoading && (
  <div 
    className="flex justify-center items-center space-x-2 p-4 bg-blue-50 border border-blue-200 rounded-lg mx-2" 
    role="status" 
    aria-live="polite" 
    aria-label={derived.progressMessage ?? (derived.isThinking ? "AIが考えています" : "処理中")}
  >
    <ThinkingAnimation 
      message={derived.progressMessage || "AIが分析中"} 
      isActive={derived.isThinking} 
    />
  </div>
)}

{/* 思考プロセスの詳細表示 */}
{state.ui.currentThought && (
  <div className="mx-2 mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
    <div className="flex items-center space-x-2 mb-2">
      <Brain className="w-4 h-4 text-blue-600" />
      <span className="text-sm font-medium text-blue-800">AIの思考プロセス</span>
    </div>
    <div className="text-sm text-blue-700 bg-white p-2 rounded border-l-2 border-blue-300">
      {state.ui.currentThought}
    </div>
  </div>
)}
```

## 🎨 **視覚的改善の追加**

### **1. プログレスバー**
```typescript
// components/ProgressBar.tsx
interface ProgressBarProps {
  progress: number;
  message: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, message }) => (
  <div className="w-full">
    <div className="flex justify-between text-sm text-blue-600 mb-1">
      <span>{message}</span>
      <span>{Math.round(progress)}%</span>
    </div>
    <div className="w-full bg-blue-200 rounded-full h-2">
      <div 
        className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);
```

### **2. 段階的表示**
```typescript
// 分析段階の視覚的表示
const ANALYSIS_STAGES = [
  { key: 'initial_analysis', label: '初期分析', icon: '🔍' },
  { key: 'deep_analysis', label: '深掘り分析', icon: '⚡' },
  { key: 'root_cause_analysis', label: '真因特定', icon: '🎯' },
  { key: 'info_request', label: '情報確認', icon: '❓' },
];

const StageIndicator: React.FC<{ currentStage: string }> = ({ currentStage }) => (
  <div className="flex space-x-4 mb-4">
    {ANALYSIS_STAGES.map((stage, index) => (
      <div 
        key={stage.key}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
          currentStage === stage.key 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-100 text-gray-600'
        }`}
      >
        <span className="text-lg">{stage.icon}</span>
        <span className="text-sm font-medium">{stage.label}</span>
      </div>
    ))}
  </div>
);
```

## 📊 **実装の優先順位**

1. **高優先度**: `thought`イベントの処理と表示
2. **中優先度**: 思考プロセスのリアルタイム表示
3. **低優先度**: アニメーションとプログレスバー

この改善により、ユーザーは単なるローディングアイコンではなく、AIの実際の思考プロセスを確認できるようになり、大幅なUX向上が期待できます。