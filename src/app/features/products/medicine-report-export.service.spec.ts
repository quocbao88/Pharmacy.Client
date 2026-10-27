import { Workbook } from 'exceljs';
import { MedicineReportExportService, MedicineReportRow } from './medicine-report-export.service';

describe('Medicine report XLSX export', () => {
  let service: MedicineReportExportService;
  let item: MedicineReportRow;

  beforeEach(() => {
    service = new MedicineReportExportService();
    item = {
      stt: 1, name: 'Bơm 10ml', batchNumber: '090526', expirationDate: '06/09/2031', unit: 'Cái',
      importPrice: 1200, sellingPrice: 3000, tonDau: 47, nhap: 0, xuat: 16, tonCuoi: 31,
      tienNhapThang: 0, thanhTienNhap: 19200, thanhTienBan: 48000, lai: 28800, tienTon: 37200
    };
  });

  it('round-trips a real XLSX with all sixteen template columns and typed data', async () => {
    const workbook = await service.buildWorkbook([item], '2026-07-01', '2026-07-31');
    const saved = await workbook.xlsx.writeBuffer();
    expect(new Uint8Array(saved).slice(0, 2)).toEqual(new Uint8Array([80, 75]));
    const loaded = new Workbook();
    await loaded.xlsx.load(saved);
    const sheet = loaded.worksheets[0];
    expect(sheet.getCell('A1').value).toBe('Báo cáo thuốc dịch vụ từ 01/07/2026 đến 31/07/2026');
    expect(sheet.getRow(3).values).toEqual([
      undefined, 'STT', 'Tên thuốc - hàm lượng', 'Số lô', 'Hạn dùng', 'ĐVT', 'Giá nhập', 'Giá bán',
      'Tồn\nđầu', 'Nhập', 'Xuất', 'Tồn\ncuối', 'Tiền\nnhập tháng',
      'Thành tiền\nnhập', 'Thành tiền\nbán', 'Lãi', 'Tiền tồn'
    ]);
    expect(sheet.getCell('C4').value).toBe('090526');
    expect(sheet.getCell('C4').numFmt).toBe('@');
    expect(sheet.getCell('D4').value).toEqual(new Date(Date.UTC(2031, 8, 6)));
    expect(sheet.getCell('D4').numFmt).toBe('dd/mm/yyyy');
    expect(sheet.getCell('F4').value).toBe(1200);
    expect(sheet.getCell('P4').value).toBe(37200);
    expect(sheet.getCell('C4').border.bottom?.style).toBe('thin');
    expect(sheet.getCell('P5').value).toEqual({ formula: 'SUM(P4:P4)', result: 37200 });
    expect(sheet.getCell('E7').value).toBe('Bộ phận KCB');
    expect(sheet.getCell('L7').value).toBe('Người báo cáo');
    expect(sheet.getCell('E12').value).toBe('Vũ thị hoàng Lan');
    expect(sheet.pageSetup.orientation).toBe('landscape');
  });

  it('keeps multiple batch-expiry pairs on separate lines in a single product row', async () => {
    item.batchNumber = '0001\n0002';
    item.expirationDate = '01/07/2031\n01/08/2032';
    const workbook = await service.buildWorkbook([item], '2026-07-01', '2026-07-31');
    const sheet = workbook.worksheets[0];
    expect(sheet.getCell('C4').value).toBe(item.batchNumber);
    expect(sheet.getCell('D4').value).toBe(item.expirationDate);
    expect(sheet.getRow(4).height).toBeGreaterThanOrEqual(32);
    expect(sheet.getCell('P5').result).toBe(37200);
  });

  it('moves totals and signatures below arbitrary numbers of products', async () => {
    const rows = Array.from({ length: 50 }, (_, index) => ({ ...item, stt: index + 1 }));
    const workbook = await service.buildWorkbook(rows, '2026-07-01', '2026-07-31');
    const sheet = workbook.worksheets[0];
    expect(sheet.getCell('B54').value).toBe('Tổng cộng');
    expect(sheet.getCell('P54').value).toEqual({ formula: 'SUM(P4:P53)', result: 50 * 37200 });
    expect(sheet.getCell('E56').value).toBe('Bộ phận KCB');
    expect(sheet.getCell('E61').value).toBe('Vũ thị hoàng Lan');
    expect(sheet.pageSetup.printArea).toBe('A1:P61');
  });

  it('exports an empty report with zero totals and no invalid SUM range', async () => {
    const workbook = await service.buildWorkbook([], '2026-07-01', '2026-07-31');
    const sheet = workbook.worksheets[0];
    expect(sheet.getCell('B4').value).toBe('Tổng cộng');
    expect(sheet.getCell('P4').value).toBe(0);
  });

  it('keeps missing dates and formula-like user content as literal text', async () => {
    item.name = '=1+1';
    item.batchNumber = '+000123';
    item.expirationDate = '—';
    const workbook = await service.buildWorkbook([item], '2026-07-01', '2026-07-31');
    const loaded = new Workbook();
    await loaded.xlsx.load(await workbook.xlsx.writeBuffer());
    expect(loaded.worksheets[0].getCell('B4').value).toBe('=1+1');
    expect(loaded.worksheets[0].getCell('C4').value).toBe('+000123');
    expect(loaded.worksheets[0].getCell('D4').value).toBe('—');
  });
});
