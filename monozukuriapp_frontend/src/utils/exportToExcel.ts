import * as XLSX from "xlsx";

function exportToExcel(data: any[], fileName: string): void {
  console.log("Exporting to Excel with data: ", data);
  const worksheet = XLSX.utils.json_to_sheet(data, {
    skipHeader: true,
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

  const blob = new Blob([buffer], { type: "application/octet-stream" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
}

export default exportToExcel;
