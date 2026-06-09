import React, { useState, useEffect, useContext, useMemo } from "react";
import { Box, Typography, Button, TextField, IconButton, Alert, Tooltip, Modal } from "@mui/material";
// import { useNavigate } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import RefreshIcon from "@mui/icons-material/Refresh";
import { BreadcrumbContext } from "@/components/layout/BreadcrumbContext";
import { useFishboneQueue } from "@/hooks/useFishboneQueue";
import { toast } from "react-toastify";
import chatService from "@/services/apis/chatService";
import { keyframes } from "@mui/system";
import { useAppSelector } from "@/core/hooks";

// Animation xoay cho trạng thái pending
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

interface AIFishboneChartProps {
  openTree?: boolean;
}

type GenerationStatus = "idle" | "generating" | "completed" | "error" | "pending" | "processing";

interface InputField {
  id: number;
  value: string;
  status: GenerationStatus;
  assistantId?: number;
  fishboneId?: number;
}

const AIFishboneChart: React.FC<AIFishboneChartProps> = () => {
  // const navigate = useNavigate();
  const { setBreadcrumbItems } = useContext(BreadcrumbContext);
  const { queue, isProcessing, addToQueue, refreshQueue, remainingFishboneAssistantThisMonth } = useFishboneQueue();
  const [isOpenModalRemoveField, setIsOpenModalRemoveField] = useState(false);
  const [idFeildRemove, setIdFieldRemove] = useState<{ id: number; assistantId: number } | null>(null);
  const [inputFields, setInputFields] = useState<InputField[]>([{ id: 1, value: "", status: "idle" }]);
  const isDisableAddMore = useMemo(() => {
    // remainingFishboneAssistantThisMonth が 0 または null の場合、ボタンを無効化
    if (!remainingFishboneAssistantThisMonth || remainingFishboneAssistantThisMonth <= 0) {
      return true;
    }
    // 未送信の入力フィールド数が残り利用可能数を超える場合、ボタンを無効化
    return inputFields.length - queue.length >= remainingFishboneAssistantThisMonth;
  }, [remainingFishboneAssistantThisMonth, inputFields.length, queue.length]);

  const [error, setError] = useState<string | null>(null);
  const [retryingItems, setRetryingItems] = useState<Set<number>>(new Set());
  const userRole = useAppSelector((state) => state.auth.user.role);
  const canCreateFishbone = !userRole?.FISHBONE_CREATE_PAGE;
  const canCallAI = !userRole?.FISHBONE_AI_TEST;
  const MAX_INPUT_LENGTH = 50;

  React.useEffect(() => {
    setBreadcrumbItems([{ label: "特性要因図作成ツール", href: "#" }]);
    return () => setBreadcrumbItems([]);
  }, [setBreadcrumbItems]);

  // Sync queue with input fields
  useEffect(() => {
    const queueMapByAssistantId = new Map(queue.map((item) => [item.assistantId, item]));

    // Only create input fields from queue if inputFields is completely empty
    if (queue.length > 0 && inputFields.length === 1 && !inputFields[0].value) {
      const newInputFields = queue.map((item, index) => ({
        id: index + 1,
        value: item.problem,
        status: item.status,
        assistantId: item.assistantId,
        fishboneId: item.fishboneId,
      }));
      setInputFields(newInputFields);
    } else {
      // Update status for fields that match with queue (by assistantId to avoid name collisions)
      setInputFields((prev) => {
        const updated = prev.map((field) => {
          const queueItem = field.assistantId ? queueMapByAssistantId.get(field.assistantId) : undefined;
          if (queueItem) {
            return {
              ...field,
              status: queueItem.status,
              assistantId: queueItem.assistantId,
              fishboneId: queueItem.fishboneId,
            };
          }
          // If field has value but not in queue, keep it as idle (not pending)
          // Only change to pending when user explicitly clicks AI生成 button
          if (field.value.trim()) {
            return {
              ...field,
              status:
                !!field?.assistantId && !queue.find((q) => q.id === field.assistantId)
                  ? "completed"
                  : ("idle" as GenerationStatus),
            };
          }
          // Keep field unchanged if empty
          return field;
        });

        return updated;
      });
    }
  }, [queue]);

  // Stop socket calls when all items are completed
  useEffect(() => {
    const allCompleted = inputFields.every((field) => field.value.trim() && field.status === "completed");

    if (allCompleted && inputFields.length > 0) {
      // Socket will be re-enabled when new items are added
    }
  }, [inputFields]);

  const handleAddField = () => {
    const newId = Math.max(...inputFields.map((field) => field.id)) + 1;
    setInputFields([...inputFields, { id: newId, value: "", status: "idle" }]);
  };

  const handleRemoveField = async ({ id, assistantId }: { id: number; assistantId: number }) => {
    if (inputFields.length > 1) {
      setInputFields(inputFields.filter((field) => field.id !== id));
      if (!assistantId) return;
      try {
        await chatService.cancelQueue({ assistantId });
        toast.success("キューから項目を削除しました");
      } catch (error) {
        console.error("Error cancelling queue item:", error);
        toast.error("キューから項目を削除できませんでした");
      }
    }
  };

  const handleOpenModalRemoveField = (field: any) => {
    setIsOpenModalRemoveField(true);
    if (!field.id) return;
    setIdFieldRemove({ id: field.id, assistantId: field.assistantId });
  };

  const handleInputChange = (id: number, value: string) => {
    setInputFields((prev) => {
      const updated = prev.map((field) => (field.id === id ? { ...field, value } : field));
      return updated;
    });
  };

  const handleGenerate = async () => {
    const tooLong = inputFields.some((field) => field.value.trim().length > MAX_INPUT_LENGTH);
    if (tooLong) {
      setError("各入力は50文字以内で入力してください");
      return;
    }
    const validFields = inputFields.filter((field) => field.value.trim());

    if (validFields.length === 0) {
      setError("トップ事象を記入してください");
      return;
    }

    setError(null);

    try {
      // Only add fields that are not completed to queue
      const fieldsToAdd = validFields.filter((field) => {
        // If field already has assistantId and status is completed, skip it
        if (field.assistantId && field.status === "completed") {
          return false;
        }
        return true;
      });

      if (fieldsToAdd.length === 0) {
        toast.info("追加する項目がありません（すべて完了済み）");
        return;
      }

      // Add all valid problems to queue at once and bind assistantId back to the field
      for (const field of fieldsToAdd) {
        try {
          const newItem = await addToQueue(field.value);
          if (newItem) {
            setInputFields((prev) =>
              prev.map((f) =>
                f.id === field.id
                  ? { ...f, assistantId: newItem.assistantId, status: "pending" as GenerationStatus }
                  : f,
              ),
            );
          }
        } catch (error) {
          throw error;
          // no-op; error toast handled inside addToQueue
        }
      }

      // Trigger processing after all items are added
      try {
        await chatService.triggerProcessing();
      } catch (error) {
        console.error("Error triggering processing:", error);
        throw error;
      }

      // Don't clear input fields immediately - let the queue sync update them
      // setInputFields([{ id: 1, value: "", status: "idle" }]);

      toast.success(`${fieldsToAdd.length}件のAI生成を開始しました`);
    } catch (error) {
      console.error("Error generating fishbones:", error);
      setError("AI生成の開始に失敗しました");
    }
  };

  // const handleViewResults = () => {
  //   const completedItems = queue.filter((item) => item.status === "completed");
  //   if (completedItems.length > 0) {
  //     // Navigate to AI-generated fishbones list
  //     navigate("/diagram/ai-fishbone-list");
  //   } else {
  //     toast.info("完了した項目がありません");
  //   }
  // };

  const handleRetry = async (assistantId: number) => {
    if (retryingItems.has(assistantId)) return;

    setRetryingItems((prev) => new Set(prev).add(assistantId));

    try {
      // Find item in queue to get problem
      const queueItem = queue.find((item) => item.assistantId === assistantId);
      if (!queueItem) {
        toast.error("項目が見つかりません");
        return;
      }

      // Check if item is too old (more than 1 day)
      const itemDate = new Date(queueItem.createdAt);
      const now = new Date();
      const daysDiff = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff > 1) {
        // Item is too old, try to reset status first
        try {
          await chatService.resetItemStatus(assistantId);

          // After reset, try to process pending items
          await chatService.processPendingItems();
          toast.success("項目の状態をリセットして再処理を開始しました");
        } catch (resetError) {
          // If reset fails, create new item
          await addToQueue(queueItem.problem);
          toast.success("新しい項目を作成しました");
        }
      } else {
        // Item is not too old, use retrySpecificItem endpoint
        const result = await chatService.retrySpecificItem(assistantId);
        if (result.data?.success) {
          toast.success("再処理を開始しました");
        } else {
          toast.error(result.data?.message || "再処理の開始に失敗しました");
        }
      }

      // Refresh queue after a short delay to get updated status
      setTimeout(() => {
        refreshQueue();
      }, 1000);
    } catch (error) {
      console.error("Error retrying item:", error);
      toast.error("再処理の開始に失敗しました");
    } finally {
      setRetryingItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(assistantId);
        return newSet;
      });
    }
  };

  // const handleRetryAllPending = async () => {
  //   const pendingItems = queue.filter((item) => item.status === "pending");
  //   if (pendingItems.length === 0) {
  //     toast.info("再処理する項目がありません");
  //     return;
  //   }

  //   try {
  //     // Check if there are old items
  //     const now = new Date();
  //     const hasOldItems = pendingItems.some((item) => {
  //       const itemDate = new Date(item.createdAt);
  //       const daysDiff = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24);
  //       return daysDiff > 1;
  //     });

  //     if (hasOldItems) {
  //       // There are old items, recreate all pending items
  //       for (const item of pendingItems) {
  //         try {
  //           await addToQueue(item.problem);
  //         } catch (error) {
  //           console.error(`Error recreating item for ${item.problem}:`, error);
  //         }
  //       }
  //       toast.success(`${pendingItems.length}件の新しい項目を作成しました`);
  //     } else {
  //       // No old items, use processPendingItems
  //       await chatService.processPendingItems();
  //       toast.success(`${pendingItems.length}件の再処理を開始しました`);
  //     }

  //     // Refresh queue after a short delay to get updated status
  //     setTimeout(() => {
  //       refreshQueue();
  //     }, 1000);
  //   } catch (error) {
  //     console.error("Error retrying all pending items:", error);
  //     toast.error("再処理の開始に失敗しました");
  //   }
  // };

  const getStatusIcon = (status: GenerationStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircleIcon sx={{ color: "#22996E", fontSize: 20 }} />;
      case "error":
        return <ErrorIcon sx={{ color: "#E03E43", fontSize: 20 }} />;
      case "processing":
        return (
          <HourglassEmptyIcon
            sx={{
              color: "#FFA500",
              fontSize: 20,
              animation: `${spin} 2s linear infinite`,
              transformOrigin: "50% 50%",
            }}
          />
        );
      case "pending":
        return (
          <HourglassEmptyIcon
            sx={{
              color: "#5F6D7E",
              fontSize: 20,
              animation: `${spin} 2s linear infinite`,
              transformOrigin: "50% 50%",
            }}
          />
        );
      default:
        return null;
    }
  };

  const getStatusText = (status: GenerationStatus) => {
    switch (status) {
      case "completed":
        return "完了";
      case "error":
        return "エラー";
      case "generating":
      case "processing":
        return "生成中";
      case "pending":
        return "待機中";
      default:
        return "";
    }
  };

  const getStatusColor = (status: GenerationStatus) => {
    switch (status) {
      case "completed":
        return "#22996E";
      case "error":
        return "#E03E43";
      case "generating":
      case "processing":
        return "#FFA500";
      case "pending":
        return "#5F6D7E";
      default:
        return "#5F6D7E";
    }
  };

  // Check if there are any pending items
  // const hasPendingItems = queue.some((item) => item.status === "pending");

  return (
    <div className="p-4 mx-auto w-full">
      <h1 className="font-bold text-2xl mb-4">
        <div className="mb-2">解決したい事象を入力後 【AI生成】 ボタンをクリックしてください。</div>
        <div className="mb-1">生成結果はマイプロジェクトから確認できます。</div>
        <div className="mb-1">AI生成には1~2分程度かかります。</div>
        <div className="mb-1">生成処理中、他のページを利用できます。</div>
      </h1>

      {/* Remaining usage info */}
      <Box sx={{ mb: 3, p: 2, bgcolor: "#F3F4F6", borderRadius: 1, display: "flex", alignItems: "center", gap: 1 }}>
        <Typography
          variant="body2"
          sx={{ color: "#374151", fontWeight: 500 }}
        >
          今月の残り利用可能回数:
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: remainingFishboneAssistantThisMonth > 0 ? "#22996E" : "#E03E43",
            fontWeight: "bold",
            fontSize: "1.1rem",
          }}
        >
          {remainingFishboneAssistantThisMonth !== null && remainingFishboneAssistantThisMonth !== undefined
            ? `${remainingFishboneAssistantThisMonth}回`
            : "読み込み中..."}
        </Typography>
        {remainingFishboneAssistantThisMonth <= 0 && (
          <Typography
            variant="body2"
            sx={{ color: "#E03E43", ml: 2 }}
          >
            （上限に達しました）
          </Typography>
        )}
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {/* {hasPendingItems && (
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRetryAllPending}
            sx={{
              borderColor: '#5F6D7E',
              color: '#5F6D7E',
              '&:hover': {
                borderColor: '#4B73FF',
                color: '#4B73FF',
              }
            }}
          >
            待機中の項目を再処理
          </Button>
        </Box>
      )} */}

      {/* Input Fields Section */}
      <div className="w-[80%]">
        {inputFields.map((field) => (
          <div
            className="w-full flex items-center gap-3 mx-4 mb-3"
            key={field.id}
          >
            <TextField
              variant="outlined"
              placeholder="トップ事象を記入してください"
              className="w-[80%]"
              value={field.value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              inputProps={{ maxLength: MAX_INPUT_LENGTH }}
              error={field.value.trim().length > MAX_INPUT_LENGTH}
              helperText={field.value.trim().length > MAX_INPUT_LENGTH ? "50文字以内で入力してください" : undefined}
              disabled={field.status === "generating" || field.status === "processing" || field.status === "completed"}
            />
            <Box className="flex items-center gap-2">
              <Tooltip
                title={
                  isDisableAddMore
                    ? remainingFishboneAssistantThisMonth <= 0
                      ? "月間の利用上限に達しました"
                      : "追加可能な入力欄の上限に達しました"
                    : "入力欄を追加"
                }
              >
                <span>
                  <IconButton
                    onClick={handleAddField}
                    disabled={isDisableAddMore}
                    sx={{
                      backgroundColor: "#004D0D",
                      color: "white",
                      borderRadius: 2,
                      "&:hover": { backgroundColor: "#1B7A5A" },
                      "&:disabled": {
                        backgroundColor: "#E5E8EC",
                        color: "#9CA3AF",
                      },
                    }}
                  >
                    <AddIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <IconButton
                onClick={() => handleOpenModalRemoveField(field)}
                disabled={inputFields.length === 1 || field.status === "completed"}
                sx={{
                  backgroundColor: inputFields.length === 1 || field.status === "completed" ? "#E5E8EC" : "#004D0D",
                  color: inputFields.length === 1 || field.status === "completed" ? "#9CA3AF" : "white",
                  borderRadius: 2,
                  "&:hover": {
                    backgroundColor: inputFields.length === 1 || field.status === "completed" ? "#E5E8EC" : "#004D0D",
                  },
                  "&:disabled": {
                    backgroundColor: "#E5E8EC",
                    color: "#9CA3AF",
                  },
                }}
              >
                <RemoveIcon />
              </IconButton>
            </Box>
            <div className="min-w-[120px]">
              {field.status !== "idle" && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {getStatusIcon(field.status)}
                  <Typography
                    variant="body2"
                    sx={{ color: getStatusColor(field.status) }}
                  >
                    {getStatusText(field.status)}
                  </Typography>
                  {/* Retry button for pending and error items */}
                  {(field.status === "pending" || field.status === "error") && field.assistantId && (
                    <IconButton
                      size="small"
                      onClick={() => handleRetry(field.assistantId!)}
                      disabled={retryingItems.has(field.assistantId!)}
                      sx={{
                        color: field.status === "error" ? "#E03E43" : "#4B73FF",
                        "&:hover": {
                          backgroundColor:
                            field.status === "error" ? "rgba(224, 62, 67, 0.1)" : "rgba(75, 115, 255, 0.1)",
                        },
                        "&:disabled": {
                          color: "#CCCCCC",
                        },
                      }}
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              )}
            </div>
          </div>
        ))}

        <div className="flex items-center mb-2 gap-2 mx-4 mt-8">
          <div className="flex-1"></div>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={canCreateFishbone || canCallAI || isProcessing || inputFields.some((f) => !f.value.trim())}
            className="!bg-[#004D0D] hover:!bg-[#1B7A5A] !min-w-[7rem]  disabled:!bg-[#E5E8EC]"
          >
            {isProcessing ? "生成中..." : "AI生成"}
          </Button>
        </div>
      </div>
      <Modal
        open={isOpenModalRemoveField}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
        closeAfterTransition
        BackdropProps={{
          timeout: 300,
        }}
        sx={{
          "& .MuiBackdrop-root": {
            transition: "opacity 0.3s ease !important",
          },
        }}
        className="absolute"
      >
        <div className="bg-white w-fit p-4 min-w-[25vw] relative top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 outline-none rounded-lg shadow-lg min-h-[160px]">
          <h2
            id="modal-modal-title"
            className="text-lg font-bold mb-4"
          >
            入力欄の削除
          </h2>
          <p
            id="modal-modal-description"
            className="mb-6"
          >
            本当にこの入力欄を削除してもよろしいですか？
          </p>
          <div className="flex justify-end gap-4">
            <Button
              variant="outlined"
              onClick={() => setIsOpenModalRemoveField(false)}
              sx={{
                borderColor: "#9CA3AF",
                color: "#9CA3AF",
                "&:hover": {
                  borderColor: "#4B73FF",
                  color: "#4B73FF",
                },
              }}
            >
              いいえ
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                if (idFeildRemove !== null) {
                  handleRemoveField(idFeildRemove);
                }
                setIsOpenModalRemoveField(false);
              }}
              sx={{
                backgroundColor: "#E03E43",
                "&:hover": {
                  backgroundColor: "#B83132",
                },
              }}
            >
              はい
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AIFishboneChart;
