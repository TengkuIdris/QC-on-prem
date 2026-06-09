import { FTATree, FTANode } from "../types/ftaTypes";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export const exportToJson = (tree: FTATree): void => {
  const jsonString = JSON.stringify(tree, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${tree.name}_fta_export.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportToCsv = (tree: FTATree): void => {
  const rows: string[] = ["id,content,type,gateType,probability,parentId"];

  const addNodeToCsv = (node: FTANode, parentId: string | null) => {
    rows.push(
      `${node.id},"${node.content}",${node.type},${node.gateType || ""},${node.probability || ""},${parentId || ""}`,
    );
    if (node.children) {
      node.children.forEach((child) => addNodeToCsv(child, node.id));
    }
  };

  addNodeToCsv(tree.root, null);
  const csvContent = rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${tree.name}_fta_export.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportToPdf = (tree: FTATree): void => {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(`Fault Tree Analysis: ${tree.name}`, 14, 22);

  doc.setFontSize(12);
  doc.text(`Description: ${tree.description}`, 14, 32);
  doc.text(`Created: ${new Date(tree.createdAt).toLocaleString()}`, 14, 40);
  doc.text(`Last Updated: ${new Date(tree.updatedAt).toLocaleString()}`, 14, 48);

  const tableData: string[][] = [];
  const addNodeToTable = (node: FTANode, level: number) => {
    tableData.push([
      "  ".repeat(level) + node.content,
      node.type,
      node.gateType as string,
      node.probability ? (node.probability * 100).toFixed(2) + "%" : "",
    ]);
    if (node.children) {
      node.children.forEach((child) => addNodeToTable(child, level + 1));
    }
  };

  addNodeToTable(tree.root, 0);

  (doc as any).autoTable({
    startY: 60,
    head: [["Event/Gate", "Type", "Gate Type", "Probability"]],
    body: tableData,
  });

  doc.save(`${tree.name}_fta_export.pdf`);
};
