import { useState } from "react";
import { FTATree } from "../types/ftaTypes";

export const useFTAData = () => {
  const [currentTree, setCurrentTree] = useState<FTATree | null>(null);

  const createTree = (treeData: Partial<FTATree>) => {
    setCurrentTree(treeData as FTATree);
  };

  // 他のメソッドも同様にモック実装に置き換えます

  return {
    currentTree,
    createTree,
    // 他のメソッド
  };
};
