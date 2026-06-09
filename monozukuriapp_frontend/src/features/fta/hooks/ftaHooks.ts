export const useNodeActions = () => {
  // const dispatch = useAppDispatch();
  // const selectedNode = useAppSelector(selectSelectedNode);
  // const handleNodeSelect = useCallback(
  //   (node: Node) => {
  //     dispatch(setSelectedNode(node));
  //   },
  //   [dispatch],
  // );
  // const handleSendToAI = useCallback(
  //   (node: Node) => {
  //     const message = `You've sent information about "${node.name}". What would you like to know about this node?`;
  //     dispatch(addMessage({ text: message, sender: "ai" }));
  //   },
  //   [dispatch],
  // );
  // const handleAddChild = useCallback(
  //   (parentId: string) => {
  //     dispatch(addNode(parentId));
  //   },
  //   [dispatch],
  // );
  // const handleRemoveNode = useCallback(
  //   (nodeId: string) => {
  //     dispatch(removeNode(nodeId));
  //   },
  //   [dispatch],
  // );
  // const handleEditNode = useCallback(
  //   (nodeId: string, newName: string) => {
  //     dispatch(updateNode({ id: nodeId, name: newName }));
  //   },
  //   [dispatch],
  // );
  // const handleToggle = useCallback(
  //   (nodeId: string) => {
  //     dispatch(toggleNode(nodeId));
  //   },
  //   [dispatch],
  // );
  // return useMemo(
  //   () => ({
  //     handleNodeSelect,
  //     handleSendToAI,
  //     handleAddChild,
  //     handleRemoveNode,
  //     handleEditNode,
  //     handleToggle,
  //     selectedNode,
  //   }),
  //   [handleNodeSelect, handleSendToAI, handleAddChild, handleRemoveNode, handleEditNode, handleToggle, selectedNode],
  // );
};

export const useTreeActions = () => {
  // const dispatch = useAppDispatch();
  // const handleAddChild = useCallback(
  //   (parentId: string) => {
  //     dispatch(addNode(parentId));
  //   },
  //   [dispatch],
  // );
  // const handleRemoveNode = useCallback(
  //   (nodeId: string) => {
  //     dispatch(removeNode(nodeId));
  //   },
  //   [dispatch],
  // );
  // const handleEditNode = useCallback(
  //   (nodeId: string, newName: string) => {
  //     dispatch(updateNode({ id: nodeId, name: newName }));
  //   },
  //   [dispatch],
  // );
  // const handleToggle = useCallback(
  //   (nodeId: string) => {
  //     dispatch(toggleNode(nodeId));
  //   },
  //   [dispatch],
  // );
  // return { handleAddChild, handleRemoveNode, handleEditNode, handleToggle };
};

export const useChatActions = () => {
  // const dispatch = useAppDispatch();
  // const [inputText, setInputText] = useState("");
  // const messages = useAppSelector(selectMessages);
  // const isTyping = useAppSelector(selectIsTyping);
  // const handleSend = useCallback(async () => {
  //   if (inputText.trim()) {
  //     dispatch(addMessage({ text: inputText, sender: "user" }));
  //     dispatch(setTyping(true));
  //     try {
  //       const aiResponse = await sendMessageToAI(inputText);
  //       dispatch(addMessage({ text: aiResponse, sender: "ai" }));
  //     } catch (error) {
  //       console.error("Error:", error);
  //       dispatch(addMessage({ text: "Sorry, I couldn't process that request.", sender: "ai" }));
  //     }
  //     dispatch(setTyping(false));
  //     setInputText("");
  //   }
  // }, [inputText, dispatch]);
  // return useMemo(
  //   () => ({
  //     handleSend,
  //     inputText,
  //     setInputText,
  //     messages,
  //     isTyping,
  //   }),
  //   [handleSend, inputText, messages, isTyping],
  // );
};

export const useTreeData = () => {
  // const dispatch = useAppDispatch();
  // const treeData = useAppSelector(selectTreeData);
  // const handleSaveTree = useCallback(() => {
  //   localStorage.setItem("ftaTreeData", JSON.stringify(treeData));
  // }, [treeData]);
  // const handleLoadTree = useCallback(() => {
  //   const savedData = localStorage.getItem("ftaTreeData");
  //   if (savedData) {
  //     dispatch(setTreeData(JSON.parse(savedData)));
  //   }
  // }, [dispatch]);
  // return useMemo(
  //   () => ({
  //     treeData,
  //     handleSaveTree,
  //     handleLoadTree,
  //   }),
  //   [treeData, handleSaveTree, handleLoadTree],
  // );
};
