import { Injectable } from "@nestjs/common";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ExcelJS = require("exceljs");

interface WhyNode {
    id: string;
    name: string;
    level: number;
    parent_id?: string;
    children_ids?: string[];
    supporting_facts?: string;
    is_root_cause?: boolean;
    recurrence_prevention_measures?: string;
    is_final?: boolean;
}

interface ExcelRow {
    [key: string]: string;
}

@Injectable()
export class ExportExcelService {
    /**
     * Finds the maximum depth (level) in nodes to determine number of "なぜ" columns
     */
    private findMaxDepth(nodes: WhyNode[]): number {
        let maxDepth = 0;
        for (const node of nodes) {
            if (node.level > maxDepth && !node.is_final) {
                maxDepth = node.level;
            }
        }
        return maxDepth;
    }

    /**
     * Creates an empty Excel row with all columns
     */
    private createEmptyRow(maxDepth: number, problem: string = ""): ExcelRow {
        const row: ExcelRow = {
            問題: problem,
        };
        for (let l = 1; l <= maxDepth; l++) {
            row[`なぜ${l}（${l}次要因）`] = "";
        }
        row.真の原因 = "";
        row.対策 = "";
        return row;
    }

    /**
     * Converts tree structure to Excel rows
     */
    private treeToExcelRows(
        rootNode: WhyNode,
        nodeMap: Map<string, WhyNode>,
        maxDepth: number,
    ): ExcelRow[] {
        const rows: ExcelRow[] = [];
        const problem = rootNode.name || "";
        const nodeRowMap = new Map<string, number>();

        const processNode = (
            currentNode: WhyNode,
            parentRowIndex: number | null,
            isFirstChild: boolean,
        ): number => {
            if (currentNode.level === 0) {
                return parentRowIndex ?? 0;
            }

            if (currentNode.is_final || currentNode.id.startsWith("final-")) {
                if (parentRowIndex !== null && parentRowIndex >= 0) {
                    const countermeasureText = currentNode.recurrence_prevention_measures || "";
                    if (countermeasureText) {
                        rows[parentRowIndex].対策 = countermeasureText;
                    }
                }
                return parentRowIndex ?? 0;
            }

            let currentRowIndex: number;

            if (currentNode.is_root_cause === true) {
                currentRowIndex = rows.length;
                rows.push(this.createEmptyRow(maxDepth, currentRowIndex === 0 ? problem : ""));
            } else if (isFirstChild && parentRowIndex !== null) {
                currentRowIndex = parentRowIndex;
            } else {
                currentRowIndex = rows.length;
                rows.push(this.createEmptyRow(maxDepth, currentRowIndex === 0 ? problem : ""));
            }

            nodeRowMap.set(currentNode.id, currentRowIndex);

            const nodeText = currentNode.name || "";
            const level = currentNode.level;

            if (currentNode.is_root_cause === true) {
                if (level >= 1 && level <= maxDepth) {
                    const columnName = `なぜ${level}（${level}次要因）`;
                    rows[currentRowIndex][columnName] = nodeText;
                }

                const rootCauseText = currentNode.supporting_facts || currentNode.name || "";
                rows[currentRowIndex].真の原因 = rootCauseText;

                const countermeasureText = currentNode.recurrence_prevention_measures || "";
                if (countermeasureText) {
                    rows[currentRowIndex].対策 = countermeasureText;
                }
            } else {
                if (level >= 1 && level <= maxDepth) {
                    const columnName = `なぜ${level}（${level}次要因）`;
                    rows[currentRowIndex][columnName] = nodeText;
                }
            }

            const childrenIds = currentNode.children_ids || [];
            let lastChildRowIndex = currentRowIndex;

            const regularChildren: string[] = [];
            const finalChildren: string[] = [];

            for (const childId of childrenIds) {
                const childNode = nodeMap.get(childId);
                if (childNode) {
                    if (childNode.is_final || childId.startsWith("final-")) {
                        finalChildren.push(childId);
                    } else {
                        regularChildren.push(childId);
                    }
                }
            }

            const rootCauseChildren: string[] = [];
            const nonRootCauseChildren: string[] = [];

            for (const childId of regularChildren) {
                const childNode = nodeMap.get(childId);
                if (childNode) {
                    if (childNode.is_root_cause === true) {
                        rootCauseChildren.push(childId);
                    } else {
                        nonRootCauseChildren.push(childId);
                    }
                }
            }

            for (let i = 0; i < nonRootCauseChildren.length; i++) {
                const childId = nonRootCauseChildren[i];
                const childNode = nodeMap.get(childId);
                if (childNode) {
                    const isFirst = i === 0;
                    lastChildRowIndex = processNode(childNode, currentRowIndex, isFirst);
                }
            }

            for (const childId of rootCauseChildren) {
                const childNode = nodeMap.get(childId);
                if (childNode && childNode.is_root_cause === true) {
                    lastChildRowIndex = processNode(childNode, null, false);
                }
            }

            for (const childId of finalChildren) {
                const childNode = nodeMap.get(childId);
                if (childNode) {
                    processNode(childNode, currentRowIndex, false);
                }
            }

            return lastChildRowIndex;
        };

        if (rootNode.children_ids) {
            let lastRowIndex = -1;
            for (let i = 0; i < rootNode.children_ids.length; i++) {
                const childId = rootNode.children_ids[i];
                const childNode = nodeMap.get(childId);
                if (childNode) {
                    const isFirst = i === 0;
                    lastRowIndex = processNode(childNode, null, isFirst);
                }
            }
        }

        return rows;
    }

    /**
     * Exports Why-Why analysis tree to Excel file
     */
    async exportWhyWhyToExcel(nodes: WhyNode[], fileName?: string): Promise<Buffer> {
        if (!nodes || nodes.length === 0) {
            throw new Error("No nodes provided for export");
        }

        const filteredNodes = nodes.filter((node) => {
            return !node.id.startsWith("final-");
        });

        const cleanedNodes = filteredNodes.map((node) => {
            if (node.children_ids) {
                const cleanedChildren = node.children_ids.filter(
                    (childId) => !childId.startsWith("final-"),
                );
                return { ...node, children_ids: cleanedChildren };
            }
            return node;
        });

        const nodeMap = new Map<string, WhyNode>();
        cleanedNodes.forEach((node) => {
            nodeMap.set(node.id, node);
        });

        const rootNode = cleanedNodes.find((n) => n.id === "root" || n.level === 0);
        if (!rootNode) {
            throw new Error("No root node found");
        }

        const maxDepth = this.findMaxDepth(cleanedNodes);
        const allRows = this.treeToExcelRows(rootNode, nodeMap, maxDepth);

        if (allRows.length === 0) {
            throw new Error("No rows generated");
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("なぜなぜ分析");

        const headers = Object.keys(allRows[0] || {});
        const headerRow = worksheet.addRow(headers);

        // Style header row
        headerRow.eachCell((cell) => {
            cell.font = { bold: true };
            cell.alignment = {
                vertical: "middle",
                horizontal: "center",
            };
        });

        allRows.forEach((row) => {
            const rowData = headers.map((header) => row[header] || "");
            worksheet.addRow(rowData);
        });

        worksheet.getColumn(1).width = 40;
        for (let l = 1; l <= maxDepth; l++) {
            worksheet.getColumn(l + 1).width = 30;
        }
        worksheet.getColumn(maxDepth + 2).width = 40;
        worksheet.getColumn(maxDepth + 3).width = 40;

        // Apply styling to data rows only (skip header row at index 1)
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                row.eachCell((cell) => {
                    cell.alignment = {
                        vertical: "top",
                        horizontal: "left",
                        wrapText: true,
                    };
                });
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
}

