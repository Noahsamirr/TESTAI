import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export function exportToPdf(title: string, columns: string[], data: string[][]) {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text(title, 14, 22);

  autoTable(doc, {
    startY: 30,
    head: [columns],
    body: data,
    theme: 'grid',
    headStyles: { fillColor: [99, 102, 241] }, // brand primary
  });

  doc.save(`${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
}

export function exportToExcel(title: string, data: Record<string, any>[]) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  
  XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_').toLowerCase()}.xlsx`);
}
