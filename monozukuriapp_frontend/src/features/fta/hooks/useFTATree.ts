import { useState, useCallback, useReducer } from "react";
import { FTATree, FTANode, GateType } from "../types/ftaTypes";

type Action =
  | { type: "SET_TREE"; payload: FTATree }
  | { type: "ADD_NODE"; payload: { parentId: string; node: FTANode } }
  | { type: "UPDATE_NODE"; payload: { nodeId: string; updates: Partial<FTANode> } }
  | { type: "DELETE_NODE"; payload: string }
  | { type: "MOVE_NODE"; payload: { nodeId: string; newParentId: string } };

const initialTree: FTATree = {
  id: "mock-tree-1",
  name: "Mock FTA Tree",
  description: "This is a mock FTA tree for testing purposes",
  root: {
    id: "root",
    content: "Root Cause",
    children: [],
    gateType: "OR",
    depth: undefined,
    comment: "",
    name: "",
    type: "",
  },
  updatedAt: "",
  createdAt: "",
  tags: [],
  systemName: "",
  author: "",
  startDate: "",
  endDate: "",
  riskCriteria: "",
  analysisMode: "",
  notificationSettings: {
    email: false,
    inApp: false,
    frequency: "",
  },
};

function treeReducer(state: FTATree, action: Action): FTATree {
  switch (action.type) {
    case "SET_TREE":
      return action.payload;
    case "ADD_NODE":
      return {
        ...state,
        root: addNodeToTree(state.root, action.payload.parentId, action.payload.node),
      };
    case "UPDATE_NODE":
      return {
        ...state,
        root: updateNodeInTree(state.root, action.payload.nodeId, action.payload.updates),
      };
    case "DELETE_NODE":
      return {
        ...state,
        root: deleteNodeFromTree(state.root, action.payload),
      };
    case "MOVE_NODE":
      return {
        ...state,
        root: moveNodeInTree(state.root, action.payload.nodeId, action.payload.newParentId),
      };
    default:
      return state;
  }
}

function addNodeToTree(node: FTANode, parentId: string, newNode: FTANode): FTANode {
  if (node.id === parentId && node.children) {
    return { ...node, children: [...node.children, newNode] };
  }
  return {
    ...node,
    children: node.children?.map((child) => addNodeToTree(child, parentId, newNode)),
  };
}

function updateNodeInTree(node: FTANode, nodeId: string, updates: Partial<FTANode>): FTANode {
  if (node.id === nodeId) {
    return { ...node, ...updates };
  }
  return {
    ...node,
    children: node.children?.map((child) => updateNodeInTree(child, nodeId, updates)),
  };
}

function deleteNodeFromTree(node: FTANode, nodeId: string): FTANode {
  return {
    ...node,
    children: node.children?.filter((child) => child.id !== nodeId).map((child) => deleteNodeFromTree(child, nodeId)),
  };
}

function moveNodeInTree(node: FTANode, nodeId: string, newParentId: string): FTANode | any {
  if (node.id === newParentId) {
    const movedNode = findNodeById(node, nodeId);
    if (movedNode && node.children) {
      return {
        ...node,
        children: [...node.children, movedNode],
      };
    }
  }
  if (node.children) {
    return {
      ...node,
      children: node.children
        .filter((child) => child.id !== nodeId)
        .map((child) => moveNodeInTree(child, nodeId, newParentId)),
    };
  }
}

function findNodeById(node: FTANode, nodeId: string): FTANode | null {
  if (node.id === nodeId) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, nodeId);
      if (found) return found;
    }
  }
  return null;
}

export const useFTATree = () => {
  const [tree, dispatch] = useReducer(treeReducer, initialTree);
  const [history, setHistory] = useState<FTATree[]>([initialTree]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const setTree = useCallback(
    (newTree: FTATree) => {
      dispatch({ type: "SET_TREE", payload: newTree });
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), newTree]);
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex],
  );

  const addNode = useCallback(
    (parentId: string, content: string, gateType: GateType) => {
      const newNode: FTANode = {
        id: Date.now().toString(),
        content,
        children: [],
        gateType,
        depth: undefined,
        comment: "",
        name: "",
        type: "",
      };
      dispatch({ type: "ADD_NODE", payload: { parentId, node: newNode } });
      setHistory((prev) => [
        ...prev.slice(0, historyIndex + 1),
        { ...tree, root: addNodeToTree(tree.root, parentId, newNode) },
      ]);
      setHistoryIndex((prev) => prev + 1);
    },
    [tree, historyIndex],
  );

  const updateNode = useCallback(
    (nodeId: string, updates: Partial<FTANode>) => {
      dispatch({ type: "UPDATE_NODE", payload: { nodeId, updates } });
      setHistory((prev) => [
        ...prev.slice(0, historyIndex + 1),
        { ...tree, root: updateNodeInTree(tree.root, nodeId, updates) },
      ]);
      setHistoryIndex((prev) => prev + 1);
    },
    [tree, historyIndex],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      dispatch({ type: "DELETE_NODE", payload: nodeId });
      setHistory((prev) => [
        ...prev.slice(0, historyIndex + 1),
        { ...tree, root: deleteNodeFromTree(tree.root, nodeId) },
      ]);
      setHistoryIndex((prev) => prev + 1);
    },
    [tree, historyIndex],
  );

  const moveNode = useCallback(
    (nodeId: string, newParentId: string) => {
      dispatch({ type: "MOVE_NODE", payload: { nodeId, newParentId } });
      setHistory((prev) => [
        ...prev.slice(0, historyIndex + 1),
        { ...tree, root: moveNodeInTree(tree.root, nodeId, newParentId) },
      ]);
      setHistoryIndex((prev) => prev + 1);
    },
    [tree, historyIndex],
  );

  const saveTree = useCallback(() => {
    localStorage.setItem("ftaTree", JSON.stringify(tree));
  }, [tree]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      dispatch({ type: "SET_TREE", payload: history[historyIndex - 1] });
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      dispatch({ type: "SET_TREE", payload: history[historyIndex + 1] });
    }
  }, [history, historyIndex]);

  return {
    tree,
    setTree,
    addNode,
    updateNode,
    deleteNode,
    moveNode,
    saveTree,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
};
