// src/features/fta/utils/ftaAnalysis.ts

import { FTATree, FTANode } from "../types/ftaTypes";
import axios from "axios";

export const analyzeFTA = async (ftaTree: FTATree): Promise<string> => {
  // この関数は実際のAI分析サービスのAPIを呼び出すべきですが、
  // ここではモックの実装を提供します。

  // AIサービスのエンドポイント（実際のURLに置き換えてください）
  const AI_ENDPOINT = "https://api.example.com/analyze-fta";

  try {
    // AIサービスにFTAツリーデータを送信
    const response = await axios.post(AI_ENDPOINT, ftaTree);

    // AIからの応答を解析
    const analysisResult = response.data.result;

    // 結果を文字列として返す
    return `
      Analysis Result:
      ${analysisResult}
      
      Critical Path: ${response.data.criticalPath}
      Overall System Reliability: ${response.data.systemReliability}
      Recommended Actions: ${response.data.recommendedActions.join(", ")}
    `;
  } catch (error) {
    console.error("Error calling AI service:", error);
    return "Failed to analyze FTA. Please try again later.";
  }
};

// FTAツリーの深さを計算する補助関数
export const calculateTreeDepth = (node: FTANode): any => {
  if (node.children?.length === 0) {
    return 1;
  }
  const childDepths = node.children?.map(calculateTreeDepth);
  if (childDepths) return Math.max(...childDepths) + 1;
};

// FTAツリーの複雑さを計算する補助関数
export const calculateTreeComplexity = (node: FTANode): number => {
  let complexity = 1; // 現在のノードをカウント
  if (node.children) {
    for (const child of node.children) {
      complexity += calculateTreeComplexity(child);
    }
  }
  return complexity;
};
