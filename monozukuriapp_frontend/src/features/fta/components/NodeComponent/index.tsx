import { Input } from "@/components/ui/input"; // 元に戻す
import { EventChatType } from "@/constant/enum";
import chatService, { Message } from "@/services/apis/chatService";
import fishboneService from "@/services/apis/fishboneService"; // 元に戻す
import event from "@/utils/eventEmitter";
import { handleApi } from "@/utils/handleApi";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import ThumbDownOffAltIcon from "@mui/icons-material/ThumbDownOffAlt"; // 元に戻す
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt"; // 元に戻す
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Typography, // 元に戻す
} from "@mui/material";
import { Form, Formik, FormikProps } from "formik"; // 元に戻す
import React, { memo, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { object, string } from "yup"; // 元に戻す
import DotAnimation from "../DotAnimation";
import styles from "../Node.module.css";
import { Type } from "../Node";
import { setLoadingNodeFishbone, setNodeFishbone } from "@/store/slices/nodeFisboneSlice";
import { useAppDispatch } from "@/core/hooks";
import { ReviewStatus } from "./enums";

const NodeComponent = ({
  id,
  name,
  level,
  addChild,
  removeNode,
  updateTree,
  resetRoot,
  children: initialChildren,
  maxNode,
  isSubmittedRef,
  handleFormChange,
  limitText = 255,
  queryIds,
  disableAi,
  hoveredNodeId,
  setHoveredNodeId,
  selectedNodeId,
  setSelectedNodeId,
  editingNodeId,
  setEditingNodeId,
  isParentSelected = false,
}: any) => {
  const [children, setChildren] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [nodeLabel, setNodeLabel] = useState(name || "");
  const [open, setOpen] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shouldRender, setShouldRender] = useState({});
  const lastAddedNodeRef = useRef<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [openReview, setOpenReview] = useState<boolean>(false);
  const [openBadReview, setOpenBadReview] = useState<boolean>(false);
  const assistantId = useRef<number>();
  const formikRef = useRef<
    FormikProps<{
      bad_review: string;
    }>
  >();
  const [fishBoneId] = useSearchParams();
  const dispatch = useAppDispatch();
  const firstButtonCallAiRef = useRef<HTMLButtonElement | null>(null);
  const languageRef = useRef<string>("en");

  useEffect(() => {
    setChildren(initialChildren || []);
  }, [initialChildren, shouldRender]);

  const updateLevel = (node: any, number: number) => {
    return node.map((child: any) => {
      return {
        ...child,
        level: child.level + number,
        children: child.children.map((c: any) => ({
          ...c,
          level: c.level + number,
          children: updateLevel(c.children, number),
        })),
      };
    });
  };

  const handleUpdateDiagrams = async (data: Message) => {
    setLoading(true);
    dispatch(setLoadingNodeFishbone(true));
    const [res, err] = await handleApi(chatService.postNewMessage(data));
    if (res) {
      queryIds.current = [...queryIds.current, res.data.id];
      assistantId.current = res.data.id;
      isSubmittedRef.current = true;
      setOpenReview(true);
      setLoading(false);
      dispatch(setLoadingNodeFishbone(false));
      const updatedChildren = JSON.parse(res.data.response);
      const numberNode = typeof data.numberNode === "number" ? data.numberNode : 0;
      setChildren(updateLevel(updatedChildren, numberNode));
      updateTree({ id, name: nodeLabel, children: updateLevel(updatedChildren, numberNode), level }, Type.AI);
    } else {
      toast.error(err || "AIASSITANTの生成が失敗しましたので、再度お試しください");
      setLoading(false);
      dispatch(setLoadingNodeFishbone(false));
    }
  };

  const handleListenerCallAIWithFirstNode = async (data: { language: string }) => {
    languageRef.current = data.language;
    firstButtonCallAiRef.current?.click();
  };

  const handleAddChild = () => {
    const newLevel = level + 1;

    if (maxNode && newLevel > maxNode) {
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 3000);
      return;
    }

    const newChild = { id: Date.now(), name: "レベル " + newLevel, level: newLevel, children: [] };
    const updatedChildren = JSON.parse(JSON.stringify([...children, newChild]));

    setChildren(updatedChildren);
    addChild(newChild);

    updateTree({
      id,
      name: nodeLabel,
      children: updatedChildren,
      level,
    });
    lastAddedNodeRef.current = newChild.id;

    isSubmittedRef.current = false;
    handleFormChange("");
  };

  const handleRemoveNode = () => {
    isSubmittedRef.current = false;
    handleFormChange("");
    if (level === 0) {
      resetRoot();
    } else {
      removeNode(id);
    }
    setOpen(false);
  };

  const handleLabelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const maxLength = level === 0 ? 100 : limitText;

    if (value.length > maxLength) {
      setErrorMessage(`${maxLength}文字以内で入力してください。`);
    } else if (/[\\/:*?"<>|]/.test(value) && level === 0) {
      setErrorMessage("特殊文字で入力できません。");
    } else {
      setErrorMessage(null);
      console.log(stripEmojis(value));
      setNodeLabel(stripEmojis(value));
      handleFormChange("");
      if (id === 0 && level === 0) {
        dispatch(
          setNodeFishbone({
            diagrams: fishBoneId.get("id") || "",
            numberNode: level,
            problem: value,
          }),
        );
      }
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    setErrorMessage(null);
    updateTree({ id, name: nodeLabel, children, level });
    setShouldRender({});
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      setIsEditing(false);
      updateTree({ id, name: nodeLabel, children, level });
    }
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };
  const scrollToNode = (nodeId: number) => {
    const nodeElement = document.querySelector(`[data-node-id="${nodeId}"]`);
    if (nodeElement) {
      nodeElement.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  const handleReviewChat = async (review: ReviewStatus) => {
    const [res, error] = await handleApi(
      fishboneService.reviewFishBone({
        assistantId: assistantId.current,
        review: review,
        reason: review === ReviewStatus.GOOD ? "" : formikRef.current?.values.bad_review,
      }),
    );
    if (res) {
      toast.success("評価ありがとうございます。");
      setOpenReview(false);
      setOpenBadReview(false);
    }
    if (error) {
      toast.error("AIアシストの評価は失敗しましたので、再度お試しください。");
      setOpenReview(false);
      setOpenBadReview(false);
    }
  };

  const handleGetAmountLastChildren = (node: any[]) => {
    let amountChildren = 0;

    const countChildren = (node: any[]) => {
      for (let i = 0; i < node.length; i++) {
        amountChildren++;
        const child = node[i];
        if (child && child.children && child.children.length > 0) {
          countChildren(child.children);
        }
      }
    };

    countChildren(node);

    return amountChildren;
  };

  const stripEmojis = (str: string) => {
    return str.replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
      "",
    );
  };

  useEffect(() => {
    if (lastAddedNodeRef.current) {
      scrollToNode(lastAddedNodeRef.current);
      lastAddedNodeRef.current = null;
    }
  }, [children]);

  useEffect(() => {
    const handleListenerCallAi = () => {
      setOpenReview(false);
      setOpenBadReview(false);
    };

    if (id === 0 && level === 0) {
      dispatch(
        setNodeFishbone({
          diagrams: fishBoneId.get("id") || "",
          numberNode: level,
          problem: name,
        }),
      );
    }

    event.on(EventChatType.CALL_AI, handleListenerCallAi);

    return () => {
      event.removeListener(EventChatType.CALL_AI, handleListenerCallAi);
    };
  }, []);

  useEffect(() => {
    event.on(EventChatType.CALL_AI_WITH_FIRST_NODE, handleListenerCallAIWithFirstNode);

    return () => {
      event.removeListener(EventChatType.CALL_AI_WITH_FIRST_NODE, handleListenerCallAIWithFirstNode);
    };
  }, []);

  useEffect(() => {
    const openReviewElement = document.getElementById("openReview");
    const openBadReviewElement = document.getElementById("openBadReview");
    if (openReviewElement) {
      openReviewElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (openBadReviewElement) {
      openBadReviewElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [openReview, openBadReview]);

  return (
    <div
      className={`${styles.nodeContainer} ${level > 0 ? styles.hasParent : ""} ${selectedNodeId === id ? styles.selected : ""} ${isParentSelected ? styles.childOfSelected : ""}`}
      style={selectedNodeId === id ? { boxShadow: "0 0 8px 2px #90caf9", background: "#e3f0ff", zIndex: 2 } : {}}
      onClick={(e) => {
        e.stopPropagation();
        if (selectedNodeId !== null && editingNodeId !== null && selectedNodeId === id) {
          return;
        }
        if (selectedNodeId !== id) {
          setSelectedNodeId(id);
          setEditingNodeId(null);
        } else {
          setSelectedNodeId(null);
          setEditingNodeId(null);
        }
      }}
      onMouseEnter={() => setHoveredNodeId(id)}
      onMouseLeave={() => setHoveredNodeId(null)}
    >
      {(id === 0 || id === undefined) && level === 0 && (
        <button
          className="!hidden invisible"
          onClick={() => {
            const suggestions = Math.min(maxNode - level, 3);
            const problem = `「${name}」の原因を${suggestions}個提案してください。`;

            handleUpdateDiagrams({
              diagrams: fishBoneId.get("id") || "",
              problem,
              numberNode: level,
              lang: languageRef.current,
            });
            event.emit(EventChatType.CALL_AI, "CALL_AI");
          }}
          ref={firstButtonCallAiRef}
        />
      )}
      <Box
        sx={{
          width: 4,
          height: `calc(100% - 44px - ${(handleGetAmountLastChildren([children[children.length - 1]]) - 1) * 104}px)`,
          background: "black",
          position: "absolute",
          top: 0,
          left: 10,
        }}
      />
      {showAlert && <Alert severity="error">レベル{maxNode}以上は追加できません。</Alert>}
      <div
        className={`${styles.nodeCard} ${isEditing ? styles.editing : ""} scroll-mb-[calc((100vh_-180px)/2)]`}
        data-node-id={id}
      >
        {level !== 0 && (
          <Box
            sx={{
              width: 10,
              height: 4,
              background: "black",
              display: level === 0 ? "none" : "block",
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%)",
              left: -12,
            }}
          />
        )}

        <div className={styles.nodeLabelFixed}>{level === 0 ? "Title" : `Level ${level}`}</div>
        <div className={styles.nodeRow}>
          {editingNodeId === id ? (
            <TextField
              value={nodeLabel}
              onChange={handleLabelChange}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              autoFocus
              fullWidth
              // error={!!errorMessage}
              // helperText={errorMessage}
              variant="outlined"
              size="small"
              className={styles.inputField}
              placeholder="ここにテキストを入力してください"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              className={`!line-clamp-2 ${styles.nodeContent} `}
              onClick={(e) => {
                e.stopPropagation();
                if (selectedNodeId !== id) {
                  setSelectedNodeId(id);
                  setEditingNodeId(null);
                } else {
                  setEditingNodeId(id);
                }
              }}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                  e.stopPropagation();
                }
              }}
            >
              {nodeLabel || <span className={styles.placeholder}>ここにテキストを入力してください</span>}
            </div>
          )}
          {selectedNodeId === id && (
            <div
              className={styles.actions}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddChild();
                }}
                className={styles.actionButton}
              >
                <AddIcon fontSize="small" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClickOpen();
                }}
                className={styles.actionButton}
              >
                <DeleteIcon
                  fontSize="small"
                  style={{ color: "red" }}
                />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingNodeId(id);
                }}
                className={styles.actionButton}
              >
                <EditIcon fontSize="small" />
              </button>
              {/* {id === 0 ||
                level === 0 ||
                (!disableAi && level < maxNode && (
                  <button
                    className={`${styles.actionButton} ${styles.aiActionButton}`}
                    onClick={() => {
                      handleUpdateDiagrams({
                        diagrams: fishBoneId.get("id") || "",
                        problem: `「${name}」の原因を${Math.min(maxNode - level, 3)}個提案してください。`,
                        numberNode: level,
                        language: languageRef.current,
                      });
                      event.emit(EventChatType.CALL_AI, "CALL_AI");
                    }}
                    disabled={loading || disableAi}
                  >
                    {loading && !openReview ? <DotAnimation /> : "AI"}
                  </button>
                ))} */}
              {/* AIレビュー関連のボタンとフォーム */}
              {openReview && (
                <div
                  className="border border-solid border-[#b6a6a6] rounded-lg p-2 shadow-md ml-2 flex flex-col items-center"
                  id="openReview"
                  data-testid="review-container"
                >
                  <p className="text-[13px] font-semibold mb-1">AIアシストの評価</p>
                  <div className="flex gap-4 justify-center">
                    <ThumbUpOffAltIcon
                      className={`cursor-pointer hover:text-blue-500 text-gray-500 ${styles.actionButton}`}
                      onClick={() => handleReviewChat(ReviewStatus.GOOD)}
                      data-testid="thumbs-up-icon"
                    />
                    <ThumbDownOffAltIcon
                      className={`cursor-pointer hover:text-blue-500 ${openBadReview ? "text-blue-500" : "text-gray-500"} ${styles.actionButton}`}
                      onClick={() => {
                        setOpenBadReview(true);
                      }}
                      data-testid="thumbs-down-icon"
                    />
                  </div>
                </div>
              )}
              {openBadReview && (
                <div
                  className="border border-solid border-[#b6a6a6] rounded-lg p-2 shadow-md ml-2 mt-1"
                  id="openBadReview"
                >
                  <p className="text-[13px] font-semibold mb-1">改善点を教えてください</p>
                  <Formik
                    initialValues={{
                      bad_review: "",
                    }}
                    validationSchema={object({
                      bad_review: string()
                        .max(150, "150文字以内で入力してください")
                        .required("必須項目を入力してください。"),
                    })}
                    onSubmit={() => {}}
                    validateOnChange={true}
                    validateOnBlur={false}
                    validateOnMount={false}
                  >
                    {(formik) => {
                      formikRef.current = formik;
                      return (
                        <Form className="flex flex-col items-center gap-1">
                          <Input
                            name="bad_review"
                            value={formik.values.bad_review}
                            onChange={(e: any) => {
                              formik.setFieldValue("bad_review", e.target.value, true);
                              formik.validateField("bad_review");
                            }}
                            className={`${formik.errors.bad_review ? "border !border-[#eb3333]" : ""} w-full p-1`}
                          />
                          {formik.errors.bad_review && (
                            <Typography
                              variant="caption"
                              color="error"
                              className="!m-1 self-start"
                            >
                              {formik.errors.bad_review}
                            </Typography>
                          )}
                          <Button
                            variant="contained"
                            type="button"
                            size="small"
                            className="focus:outline-none !mt-1 self-end"
                            onClick={async () => {
                              let error = false;
                              await formik
                                .validateForm()
                                .then((res: any) => {
                                  if (res?.bad_review) {
                                    error = true;
                                    return;
                                  }
                                })
                                .catch((err) => {
                                  console.error(err);
                                });
                              if (error) {
                                return;
                              }
                              handleReviewChat(ReviewStatus.BAD);
                            }}
                          >
                            送信
                          </Button>
                        </Form>
                      );
                    }}
                  </Formik>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="text-red-500 text-xs flex w-full">{errorMessage}</div>
      </div>
      {/* Loading icon (AI実行中、レビュー表示時はこちらに表示しない) */}
      {loading && !openReview && <DotAnimation />}

      {/* Render children recursively */}
      <div className={styles.childrenContainer}>
        {children.map((child: any) => (
          <NodeComponent
            key={child.id}
            {...child}
            addChild={(newGrandChild: any) => {
              const updatedGrandChildren = JSON.parse(JSON.stringify([...child.children, newGrandChild]));
              updateTree({ ...child, children: updatedGrandChildren }, Type.USER);
            }}
            removeNode={removeNode}
            updateTree={updateTree}
            resetRoot={resetRoot}
            maxNode={maxNode}
            isSubmittedRef={isSubmittedRef}
            handleFormChange={handleFormChange}
            limitText={limitText}
            queryIds={queryIds}
            disableAi={disableAi}
            hoveredNodeId={hoveredNodeId}
            setHoveredNodeId={setHoveredNodeId}
            selectedNodeId={selectedNodeId}
            setSelectedNodeId={setSelectedNodeId}
            editingNodeId={editingNodeId}
            setEditingNodeId={setEditingNodeId}
            isParentSelected={selectedNodeId === id}
          />
        ))}
      </div>

      <Dialog
        open={open}
        onClose={handleClose}
      >
        <DialogTitle>ノードの削除</DialogTitle>
        <DialogContent>
          <DialogContentText>このノードを削除してもよろしいですか？</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleClose}
            color="primary"
          >
            キャンセル
          </Button>
          <Button
            onClick={handleRemoveNode}
            color="secondary"
            autoFocus
          >
            削除する
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default memo(NodeComponent);
