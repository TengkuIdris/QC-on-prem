import { SquarePen, Loader2, AlertCircle, Info } from "lucide-react";
import React, { memo, useState, useRef, useEffect } from "react";
import { Button } from "@/components/whywhy/ui/button";
import type { ChatMessage as ChatMessageType } from "../types";

interface ChatMessageProps {
  message: ChatMessageType;
  onEditMessage: (messageId: string, newContent: string) => void;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessageType[]>>;
  index: number;
  onAskQuestion?: (question: string) => void;
  onRetry?: (messageId: string) => void;
  willCreateFork?: boolean;
  /** Same as chat input disabled: initialLoading | sending | completed | !usingWhyWhy */
  chatDisabled?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onEditMessage,
  setChatMessages,
  index,
  onAskQuestion,
  onRetry,
  willCreateFork = false,
  chatDisabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showForkWarning, setShowForkWarning] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      const length = textarea.value.length;
      textarea.focus();
      textarea.setSelectionRange(length, length);
    }
  }, [isEditing]);

  // Click outside to cancel editing
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isEditing && textareaRef.current && !textareaRef.current.contains(event.target as Node)) {
        const target = event.target as Element;
        if (!target.closest(".edit-buttons")) {
          handleCancelEdit();
        }
      }
    };

    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing]);

  const isAI = message.type === "ai";
  const isResult = message.type === "result";
  const isError = message.type === "error";
  const isUser = message.type === "user";
  const isSystem = message.type === "system";

  // Define status flags before they're used
  const isPending = message.status === "pending";
  const isSending = message.status === "sending";
  const isFailed = message.status === "failed";

  // Generate accessible label for the message
  const messageTypeLabel = isSystem
    ? "システム"
    : isAI
      ? "AI返信"
      : isResult
        ? "結果"
        : isError
          ? "エラー"
          : isFailed
            ? "送信失敗"
            : isPending
              ? "送信待ち"
              : isSending
                ? "送信中"
                : "ユーザー";
  const ariaLabel = `${messageTypeLabel}、${message.timestamp}`;

  const handleEditClick = () => {
    if (willCreateFork && !showForkWarning) {
      // Show confirmation
      setShowForkWarning(true);
    } else {
      setIsEditing(true);
      setEditContent(message.content);
      setShowForkWarning(false);
    }
  };

  const handleSaveEdit = () => {
    const trimmedContent = editContent.trim();
    console.log("trimmedContent", trimmedContent);
    if (trimmedContent !== message.content && trimmedContent !== "") {
      onEditMessage(message.id, trimmedContent);
      setChatMessages((prev) => prev.filter((_, i) => i <= index));
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <div
      className={`p-3 rounded-lg text-sm border-l-4 transition-all duration-300 relative group ${
        isSystem
          ? "bg-indigo-50 border-indigo-400 shadow-sm"
          : isAI
            ? "bg-blue-50 border-blue-400 shadow-sm"
            : isResult
              ? "bg-green-50 border-green-400 shadow-sm"
              : isError
                ? "bg-red-50 border-red-400 shadow-sm"
                : isFailed
                  ? "bg-red-50 border-red-500 shadow-sm"
                  : isPending || isSending
                    ? "bg-gray-100 border-gray-300 opacity-60"
                    : "bg-gray-50 border-gray-300"
      }`}
      role="article"
      aria-label={ariaLabel}
      aria-live={isFailed || isError ? "polite" : undefined}
      aria-atomic={isFailed || isError ? true : undefined}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-xs text-gray-600 flex items-center">
          {isSystem && <Info className="w-3 h-3 mr-2 text-indigo-500" />}
          {isPending && <Loader2 className="w-3 h-3 mr-2 animate-spin text-gray-400" />}
          {isSending && <Loader2 className="w-3 h-3 mr-2 animate-spin text-blue-500" />}
          {isFailed && <AlertCircle className="w-3 h-3 mr-2 text-red-500" />}
          {isAI && !isPending && !isSending && !isFailed && (
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
          )}
          {isResult && <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>}
          {isError && !isFailed && <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>}
          {isSystem
            ? "システム"
            : isAI
              ? "AI返信"
              : isResult
                ? "結果"
                : isError
                  ? "エラー"
                  : isFailed
                    ? "送信失敗"
                    : isPending
                      ? "送信準備中"
                      : isSending
                        ? "送信中"
                        : "ユーザー"}
        </div>
      </div>
      <div className={`leading-relaxed whitespace-pre-wrap ${isError || isFailed ? "text-red-700" : "text-gray-800"}`}>
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full p-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
        ) : (
          <div className="min-w-0 break-words whitespace-normal ">{message.content}</div>
        )}
      </div>

      {/* Fork warning */}
      {showForkWarning && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded text-xs">
          <p className="text-yellow-800 mb-2">⚠️ このメッセージを編集すると、以降の会話が削除されます。続けますか？</p>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={handleEditClick}
              className="h-6"
            >
              編集する
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForkWarning(false)}
              className="h-6"
            >
              キャンセル
            </Button>
          </div>
        </div>
      )}

      {/* Failed message actions */}
      {isFailed && !isEditing && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-red-600">{message.error || "送信に失敗しました"}</span>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRetry(message.id)}
              className="h-6 text-xs"
              aria-label="再送信"
            >
              再送信
            </Button>
          )}
        </div>
      )}

      {isUser && !isEditing && !isFailed && (
        <button
          type="button"
          onClick={handleEditClick}
          disabled={chatDisabled}
          className={`hidden absolute bottom-2 right-2 group-hover:block bg-transparent border-0 p-1 rounded transition-colors ${
            chatDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-gray-200"
          }`}
          aria-label="メッセージを編集"
          aria-disabled={chatDisabled}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleEditClick();
            }
          }}
        >
          <SquarePen
            size={16}
            className="text-gray-500 hover:text-gray-700"
          />
        </button>
      )}
    </div>
  );
};

export default memo(ChatMessage);
