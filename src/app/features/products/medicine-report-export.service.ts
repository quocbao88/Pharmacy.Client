import { Injectable } from '@angular/core';
import type { Workbook, Worksheet } from 'exceljs';

export interface MedicineReportRow {
  stt: number;
  name: string;
  batchNumber: string;
  expirationDate: string;
  unit: string;
  importPrice: number;
  sellingPrice: number;
  tonDau: number;
  nhap: number;
  xuat: number;
  tonCuoi: number;
  tienNhapThang: number;
  thanhTienNhap: number;
  thanhTienBan: number;
  lai: number;
  tienTon: number;
}

@Injectable({ providedIn: 'root' })
export class MedicineReportExportService {
  async download(rows: MedicineReportRow[], startDate: string, endDate: string): Promise<void> {
    const workbook = await this.buildWorkbook(rows, startDate, endDate);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([new Uint8Array(buffer)], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bao_cao_thuoc_dich_vu_${startDate.replace(/-/g, '_')}_den_${endDate.replace(/-/g, '_')}.xlsx`;
    document.body.appendChild(link);

    try {
      link.click();
    } finally {
      link.remove();
      // Allow the browser to start reading the download before revoking the object URL.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  async buildWorkbook(rows: MedicineReportRow[], startDate: string, endDate: string): Promise<Workbook> {
    // ExcelJS is loaded only for Excel exports; the normal application stays small.
    const { default: excel } = await import('exceljs');
    const workbook = new excel.Workbook();
    workbook.calcProperties.fullCalcOnLoad = true;
    const sheet = workbook.addWorksheet('Báo cáo thuốc dịch vụ', {
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        printTitlesRow: '1:3'
      }
    });

    this.writeHeader(sheet, startDate, endDate);

    for (const item of rows) {
      this.writeRow(sheet, item);
    }

    this.writeTotals(sheet, rows);
    this.writeSignatures(sheet, rows.length + 6);
    sheet.pageSetup.printArea = `A1:P${rows.length + 11}`;

    return workbook;
  }

  private writeHeader(sheet: Worksheet, startDate: string, endDate: string): void {
    // Match the supplied July 2026 report: title, blank line, then the sixteen columns.
    const widths = [7.1, 28, 15, 15, 8.2, 14, 14, 10, 10, 10, 11.7, 16, 16, 16, 16, 16];
    widths.forEach((width, index) => sheet.getColumn(index + 1).width = width);
    sheet.mergeCells('A1:P1');
    const title = sheet.getCell('A1');
    title.value = `Báo cáo thuốc dịch vụ từ ${this.formatDate(startDate)} đến ${this.formatDate(endDate)}`;
    title.font = { name: 'Times New Roman', size: 16 };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 25;
    sheet.mergeCells('A2:P2');
    sheet.getCell('A2').value = 'Nhập gồm nhập hàng, hoàn kho và điều chỉnh tăng; xuất gồm bán hàng và điều chỉnh giảm. Số dư chuyển đổi cần kiểm kê thực tế.';
    sheet.getCell('A2').font = { name: 'Times New Roman', size: 10, italic: true };
    sheet.getCell('A2').alignment = { wrapText: true, vertical: 'middle' };
    sheet.getRow(2).height = 28;

    const headers = [
      'STT', 'Tên thuốc - hàm lượng', 'Số lô', 'Hạn dùng', 'ĐVT', 'Giá nhập', 'Giá bán',
      'Tồn\nđầu', 'Nhập', 'Xuất', 'Tồn\ncuối', 'Tiền\nnhập tháng',
      'Thành tiền\nnhập', 'Thành tiền\nbán', 'Lãi', 'Tiền tồn'
    ];
    const header = sheet.getRow(3);
    header.values = headers;
    header.height = 45;
    header.eachCell(cell => {
      cell.font = { name: 'Times New Roman', size: 12, bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = this.tableBorder();
    });
  }

  private writeRow(sheet: Worksheet, item: MedicineReportRow): void {
    const row = sheet.addRow([
      item.stt, item.name, item.batchNumber, this.readExpiry(item.expirationDate), item.unit,
      item.importPrice, item.sellingPrice, item.tonDau, item.nhap, item.xuat, item.tonCuoi,
      item.tienNhapThang, item.thanhTienNhap, item.thanhTienBan, item.lai, item.tienTon
    ]);
    const lines = Math.max(
      item.batchNumber.split('\n').length,
      item.expirationDate.split('\n').length,
      Math.ceil(item.name.length / 25)
    );
    row.height = Math.max(20, lines * 16);
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      cell.font = { name: 'Times New Roman', size: 12 };
      cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
      cell.border = this.tableBorder();
      cell.numFmt = '#,##0';
      if (column <= 5) {
        cell.alignment.horizontal = 'center';
        cell.numFmt = 'General';
      }
      if (column === 2) {
        cell.alignment.horizontal = 'left';
      }
    });
    // Identifiers remain strings, including leading zeros and formula-like characters.
    row.getCell(3).numFmt = '@';
    if (row.getCell(4).value instanceof Date) {
      row.getCell(4).numFmt = 'dd/mm/yyyy';
    }
  }

  private writeTotals(sheet: Worksheet, rows: MedicineReportRow[]): void {
    const total = sheet.addRow([]);
    total.getCell(2).value = 'Tổng cộng';
    const amounts = [
      rows.reduce((sum, item) => sum + item.tienNhapThang, 0),
      rows.reduce((sum, item) => sum + item.thanhTienNhap, 0),
      rows.reduce((sum, item) => sum + item.thanhTienBan, 0),
      rows.reduce((sum, item) => sum + item.lai, 0),
      rows.reduce((sum, item) => sum + item.tienTon, 0)
    ];

    for (let column = 1; column <= 16; column++) {
      const cell = total.getCell(column);
      cell.font = { name: 'Times New Roman', size: 12, bold: true };
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.border = this.tableBorder();
      cell.numFmt = '#,##0';
      if (column >= 12) {
        cell.value = 0;
        if (rows.length > 0) {
          const letter = sheet.getColumn(column).letter;
          cell.value = { formula: `SUM(${letter}4:${letter}${total.number - 1})`, result: amounts[column - 12] };
        }
      }
    }
    total.height = 23;
  }

  private writeSignatures(sheet: Worksheet, startRow: number): void {
    const signatures = [
      { column: 5, endColumn: 7, label: 'Bộ phận KCB', name: 'Vũ thị hoàng Lan' },
      { column: 12, endColumn: 14, label: 'Người báo cáo', name: 'Nguyễn Thị Thủy' }
    ];
    for (const signature of signatures) {
      sheet.mergeCells(startRow, signature.column, startRow, signature.endColumn);
      sheet.mergeCells(startRow + 5, signature.column, startRow + 5, signature.endColumn);
      const label = sheet.getCell(startRow, signature.column);
      label.value = signature.label;
      label.font = { name: 'Times New Roman', size: 12, bold: true };
      label.alignment = { horizontal: 'center' };
      const name = sheet.getCell(startRow + 5, signature.column);
      name.value = signature.name;
      name.font = { name: 'Times New Roman', size: 12, bold: true };
      name.alignment = { horizontal: 'center' };
    }
  }

  private readExpiry(value: string): Date | string {
    // A single expiry is a real Excel date; multiple paired dates stay on separate lines.
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    if (!match) {
      return value;
    }
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      return value;
    }
    return date;
  }

  private formatDate(value: string): string {
    const parts = value.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  private tableBorder(): Partial<import('exceljs').Borders> {
    const edge: import('exceljs').Border = { style: 'thin', color: { argb: 'FF000000' } };
    return { top: edge, bottom: edge, left: edge, right: edge };
  }
}
