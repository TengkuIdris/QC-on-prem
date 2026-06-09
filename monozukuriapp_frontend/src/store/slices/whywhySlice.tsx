import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { WhyWhyState, WhyWhyTree, WhyWhyNode } from "../../features/whywhy/types";
import { v4 as uuidv4 } from "uuid";

const initialState: WhyWhyState = {
  currentTree: null,
  savedTrees: [],
  loading: false,
  error: null,
};

const whywhySlice = createSlice({
  name: "whywhy",
  initialState,
  reducers: {
    createNewTree: (state, action: PayloadAction<{ name: string; problem: string }>) => {
      const newTree: WhyWhyTree = {
        id: uuidv4(),
        name: action.payload.name,
        problem: action.payload.problem,
        root: {
          id: uuidv4(),
          content: action.payload.problem,
          children: [],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
      };
      state.currentTree = newTree;
    },
    addWhyNode: (state, action: PayloadAction<{ parentId: string; content: string }>) => {
      if (!state.currentTree) return;

      const addNodeRecursive = (node: WhyWhyNode): boolean => {
        if (node.id === action.payload.parentId) {
          node.children.push({
            id: uuidv4(),
            content: action.payload.content,
            children: [],
          });
          return true;
        }
        return node.children.some(addNodeRecursive);
      };

      addNodeRecursive(state.currentTree.root);
      state.currentTree.updatedAt = new Date().toISOString();
    },
    updateNodeContent: (state, action: PayloadAction<{ nodeId: string; content: string }>) => {
      if (!state.currentTree) return;

      const updateNodeRecursive = (node: WhyWhyNode): boolean => {
        if (node.id === action.payload.nodeId) {
          node.content = action.payload.content;
          return true;
        }
        return node.children.some(updateNodeRecursive);
      };

      updateNodeRecursive(state.currentTree.root);
      state.currentTree.updatedAt = new Date().toISOString();
    },
    saveTree: (state) => {
      if (!state.currentTree) return;
      const index = state.savedTrees.findIndex((tree: { id: string }) => tree.id === state.currentTree!.id);
      if (index !== -1) {
        state.savedTrees[index] = state.currentTree;
      } else {
        state.savedTrees.push(state.currentTree);
      }
    },
    loadTree: (state, action: PayloadAction<string>) => {
      const tree = state.savedTrees.find((tree: { id: string }) => tree.id === action.payload);
      if (tree) {
        state.currentTree = tree;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    addTag: (state, action: PayloadAction<string>) => {
      if (state.currentTree) {
        state.currentTree.tags.push(action.payload);
      }
    },
    removeTag: (state, action: PayloadAction<string>) => {
      if (state.currentTree) {
        state.currentTree.tags = state.currentTree.tags.filter((tag: string) => tag !== action.payload);
      }
    },
  },
});

export const {
  createNewTree,
  addWhyNode,
  updateNodeContent,
  saveTree,
  loadTree,
  setLoading,
  setError,
  addTag,
  removeTag,
} = whywhySlice.actions;

export default whywhySlice.reducer;
