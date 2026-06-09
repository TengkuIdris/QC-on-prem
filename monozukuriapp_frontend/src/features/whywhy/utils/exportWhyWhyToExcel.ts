import type { WhyNode } from "../types"
import whyWhyApiClient from "@/services/apis/whyWhyService"

/**
 * Exports Why-Why analysis tree to Excel file via backend API
 */
export async function exportWhyWhyToExcel(nodes: WhyNode[], fileName?: string): Promise<void> {
    if (!nodes || nodes.length === 0) {
        console.warn("No nodes provided for export")
        return
    }

    try {
        // Call backend API to export Excel
        const response = await whyWhyApiClient.exportToExcel(nodes, fileName)

        // Create blob from response data (arraybuffer)
        const blob = new Blob([response.data], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        })

        // Generate filename if not provided: なぜなぜ分析_YYYYMMDD_HHMMSS.xlsx
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const defaultFileName = `なぜなぜ分析_${year}${month}${day}_${hours}${minutes}${seconds}.xlsx`
        const finalFileName = fileName || defaultFileName

        // Download file
        const link = document.createElement("a")
        link.href = URL.createObjectURL(blob)
        link.download = finalFileName

        document.body.appendChild(link)
        link.click()

        document.body.removeChild(link)
        URL.revokeObjectURL(link.href)
    } catch (error) {
        console.error("Error exporting to Excel:", error)
        throw error
    }
}
