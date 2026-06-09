import { HierarchyNode } from "d3-hierarchy";
import { Key, ReactNode } from "react";

export interface FTANode {
  depth: any;
  comment: string;
  id: string;
  name: string;
  children?: FTANode[];
  content: string | any;
  type: string;
  gateType?: string | GateType;
  probability?: number;
  comments?: string[];
  color?: string;
  // 他の必要なプロパティを追加
}

export interface FTATree {
  id: string;
  root: FTANode;
  updatedAt: string | number | Date;
  createdAt: string | number | Date;
  description: any;
  name: string;
  tags: string[];
  systemName: string;
  author: string;
  startDate: string;
  endDate: string;
  riskCriteria: string;
  analysisMode: string;
  notificationSettings: {
    email: boolean;
    inApp: boolean;
    frequency: string;
  };
}

export interface Node {
  id: string | number;
  name: string;
  isOpen?: boolean;
  children?: Node[];
  level?: number;
}

export interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
}

export interface FtaState {
  treeData: Node;
  selectedNode: Node | null;
  messages: Message[];
  isTyping: boolean;
}

export interface ExtendedHierarchyNode extends HierarchyNode<Node> {
  x0?: number;
  y0?: number;
  _children?: HierarchyNode<Node>[];
}

export interface Comment {
  id: Key | null | undefined;
  userId: any;
  content: ReactNode;
  timestamp: string | number | Date;
}

export interface GateType {}
