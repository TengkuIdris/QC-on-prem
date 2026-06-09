import { FtaState, Message, Node } from "@/features/fta/types/ftaTypes";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";

const initialState: FtaState = {
  treeData: {
    id: uuidv4(),
    name: "Root",
    isOpen: true,
    children: [],
  },
  selectedNode: null,
  messages: [],
  isTyping: false,
};

const ftaSlice = createSlice({
  name: "fta",
  initialState,
  reducers: {
    setTreeData: (state, action: PayloadAction<Node>) => {
      state.treeData = action.payload;
    },
    addNode: (state, action: PayloadAction<string>) => {
      const addNodeRecursive = (node: Node, parentId: string): boolean => {
        if (node.id === parentId) {
          if (!node.children) node.children = [];
          node.children.push({
            id: uuidv4(),
            name: "New Node",
            isOpen: true,
            children: [],
          });
          return true;
        }
        if (node.children) {
          for (let child of node.children) {
            if (addNodeRecursive(child, parentId)) return true;
          }
        }
        return false;
      };
      addNodeRecursive(state.treeData, action.payload);
    },
    removeNode: (state, action: PayloadAction<string>) => {
      const removeNodeRecursive = (node: Node, nodeId: string): boolean => {
        if (node.children) {
          const index = node.children.findIndex((child) => child.id === nodeId);
          if (index !== -1) {
            node.children.splice(index, 1);
            return true;
          }
          for (let child of node.children) {
            if (removeNodeRecursive(child, nodeId)) return true;
          }
        }
        return false;
      };
      removeNodeRecursive(state.treeData, action.payload);
    },
    updateNode: (state, action: PayloadAction<{ id: string; name: string }>) => {
      const updateNodeRecursive = (node: Node, nodeId: string, newName: string): boolean => {
        if (node.id === nodeId) {
          node.name = newName;
          return true;
        }
        if (node.children) {
          for (let child of node.children) {
            if (updateNodeRecursive(child, nodeId, newName)) return true;
          }
        }
        return false;
      };
      updateNodeRecursive(state.treeData, action.payload.id, action.payload.name);
    },
    toggleNode: (state, action: PayloadAction<string>) => {
      const toggleNodeRecursive = (node: Node, nodeId: string): boolean => {
        if (node.id === nodeId) {
          node.isOpen = !node.isOpen;
          return true;
        }
        if (node.children) {
          for (let child of node.children) {
            if (toggleNodeRecursive(child, nodeId)) return true;
          }
        }
        return false;
      };
      toggleNodeRecursive(state.treeData, action.payload);
    },
    setSelectedNode: (state, action: PayloadAction<Node | null>) => {
      state.selectedNode = action.payload;
    },
    addMessage: (state, action: PayloadAction<Omit<Message, "id">>) => {
      state.messages.push({ ...action.payload, id: uuidv4() });
    },
    setTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload;
    },
  },
});

export const { setTreeData, addNode, removeNode, updateNode, toggleNode, setSelectedNode, addMessage, setTyping } =
  ftaSlice.actions;

export default ftaSlice.reducer;
