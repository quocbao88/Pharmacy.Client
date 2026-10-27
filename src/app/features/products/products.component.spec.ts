import { FormBuilder } from '@angular/forms';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProductsComponent } from './products.component';
import { MedicineReportExportService } from './medicine-report-export.service';
import { AuthService } from '../../core/services/auth.service';
import { BatchDto, ProductDto, ProductService, StockReport } from '../../core/services/product.service';
import { OrderService } from '../../core/services/order.service';

describe('Service medicine report batch columns', () => {
  let component: ProductsComponent;
  let products: jasmine.SpyObj<ProductService>;
  let auth: jasmine.SpyObj<AuthService>;
  let orders: jasmine.SpyObj<OrderService>;
  let product: ProductDto;
  let exporter: jasmine.SpyObj<MedicineReportExportService>;

  function batch(number: string, expiration: string): BatchDto {
    return {
      id: number, productId: 'product', batchNumber: number,
      expirationDate: expiration, currentQuantity: 0
    };
  }

  function stockReport(): StockReport {
    return {
      coverageStart: '2026-07-01T00:00:00Z',
      items: [{
        name: 'Bơm 10ml', unit: 'Cái', batchNumber: '090526', expirationDate: '2031-09-06T00:00:00Z',
        importPrice: 1200, sellingPrice: 3000, openingQuantity: 10, receivedQuantity: 20,
        soldQuantity: 15, returnedQuantity: 3, adjustedQuantity: 2, closingQuantity: 20,
        receiptAmount: 24000, costAmount: 14400, revenueAmount: 36000, closingValue: 24000
      }]
    };
  }

  beforeEach(() => {
    products = jasmine.createSpyObj<ProductService>('ProductService', ['getAll', 'getAlerts', 'getStockReport', 'adjustStock', 'getBatches', 'getStockHistory']);
    products.getAlerts.and.returnValue(of({ lowStockProducts: [], expiringBatches: [] }));
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isAdmin']);
    auth.isAdmin.and.returnValue(true);
    orders = jasmine.createSpyObj<OrderService>('OrderService', ['getOrders']);
    orders.getOrders.and.returnValue(of([]));
    exporter = jasmine.createSpyObj<MedicineReportExportService>('MedicineReportExportService', ['download']);
    exporter.download.and.resolveTo();
    component = new ProductsComponent(new FormBuilder(), products, auth, orders, exporter);
    product = {
      id: 'product', supplierId: 'supplier', name: 'Bơm 10ml', unit: 'Cái',
      importPrice: 1200, sellingPrice: 3000, minStockLevel: 5,
      totalStock: 47, updatedAt: '', prescriptionRequired: false
    };
    products.getStockReport.and.returnValue(of(stockReport()));
    component.products = [product];
    component.reportStartDate = '2026-07-01';
    component.reportEndDate = '2026-07-31';
    component.reportFormat = 'xlsx';
  });

  it('uses historical journal quantities and values rather than current product stock or price', () => {
    spyOn(component, 'downloadReportXlsx');
    component.generateReportData();
    const row = component.reportItems[0];
    expect(row.batchNumber).toBe('090526');
    expect(row.expirationDate).toBe('06/09/2031');
    expect(row.tonDau + row.nhap - row.xuat).toBe(row.tonCuoi);
    expect(row.tonCuoi).toBe(20);
    expect(row.thanhTienBan).toBe(36000);
    expect(component.totalReportValues.totalStockPrice).toBe(24000);
    expect(orders.getOrders).not.toHaveBeenCalled();
  });

  it('keeps one report row for each physical lot without duplicating product totals', () => {
    const report = stockReport();
    report.items.push({ ...report.items[0], batchNumber: '000123', closingQuantity: 1, closingValue: 1200 });
    products.getStockReport.and.returnValue(of(report));
    spyOn(component, 'downloadReportXlsx');
    component.generateReportData();
    expect(component.reportItems.map(item => item.batchNumber)).toEqual(['090526', '000123']);
    expect(component.totalReportValues.totalStockPrice).toBe(25200);
  });

  it('exports an empty journal report without inventing product stock', () => {
    products.getStockReport.and.returnValue(of({ coverageStart: null, items: [] }));
    spyOn(component, 'downloadReportXlsx');
    component.generateReportData();
    expect(component.reportItems).toEqual([]);
    expect(component.totalReportValues.totalStockPrice).toBe(0);
  });

  it('shows the local calendar date used by the existing batch screen', () => {
    const report = stockReport();
    report.items[0].expirationDate = new Date(2031, 6, 2, 0, 0, 0).toISOString();
    products.getStockReport.and.returnValue(of(report));
    spyOn(component, 'downloadReportXlsx');
    component.generateReportData();
    expect(component.reportItems[0].expirationDate).toBe('02/07/2031');
  });

  it('downloads the report as XLSX with the selected period', async () => {
    product.batches = [batch('000123', '2031-07-01T00:00:00Z')];
    component.generateReportData();
    await Promise.resolve();
    expect(exporter.download).toHaveBeenCalledWith(component.reportItems, '2026-07-01', '2026-07-31');
    expect(component.isExportingReport).toBeFalse();
  });

  it('keeps the dialog open and resets export state after an Excel export failure', async () => {
    spyOn(window, 'alert');
    exporter.download.and.rejectWith(new Error('Failed to create file'));
    component.showReportModal = true;
    component.generateReportData();
    await Promise.resolve();
    expect(component.showReportModal).toBeTrue();
    expect(component.isExportingReport).toBeFalse();
    expect(window.alert).toHaveBeenCalled();
  });

  it('does not run two report exports concurrently', () => {
    exporter.download.and.returnValue(new Promise<void>(() => undefined));
    component.generateReportData();
    component.generateReportData();
    expect(exporter.download).toHaveBeenCalledTimes(1);
    expect(products.getStockReport).toHaveBeenCalledTimes(1);
  });

  it('rejects an inverted reporting period', () => {
    spyOn(window, 'alert');
    component.reportStartDate = '2026-08-01';
    component.generateReportData();
    expect(products.getStockReport).not.toHaveBeenCalled();
    expect(exporter.download).not.toHaveBeenCalled();
  });
  it('renders both print columns and aligns the total row', async () => {
    products.getAll.and.returnValue(of([product]));
    await TestBed.configureTestingModule({
      imports: [ProductsComponent],
      providers: [
        { provide: ProductService, useValue: products },
        { provide: AuthService, useValue: auth },
        { provide: OrderService, useValue: orders },
        { provide: MedicineReportExportService, useValue: exporter }
      ]
    }).compileComponents();
    const fixture = TestBed.createComponent(ProductsComponent);
    const report = fixture.componentInstance;
    fixture.detectChanges();
    product.batches = [batch('000123', '2031-07-01T00:00:00Z')];
    report.reportStartDate = '2026-07-01';
    report.reportEndDate = '2026-07-31';
    report.reportFormat = 'pdf';
    spyOn(report, 'printReportPdf').and.callFake(() => report.showPrintReport = true);
    report.generateReportData();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const table = root.querySelectorAll('#print-section > div > table')[1];
    const cells = table.querySelectorAll('tbody tr:first-child td');
    expect(table.textContent).toContain('Số lô');
    expect(table.textContent).toContain('Hạn sử dụng');
    expect(cells[2].textContent).toContain('090526');
    expect(cells[3].textContent).toContain('06/09/2031');
    expect(cells.length).toBe(17);
    const totalCells = Array.from(table.querySelectorAll('tbody tr:last-child td')) as HTMLTableCellElement[];
    expect(totalCells.reduce((sum, cell) => sum + cell.colSpan, 0)).toBe(17);
    fixture.destroy();
  });

  it('uses the landscape page for this print and restores the previous page setting', fakeAsync(() => {
    const previousPage = document.body.style.getPropertyValue('page');
    spyOn(window, 'print').and.callFake(() => {
      expect(document.body.style.getPropertyValue('page')).toBe('medicine-report');
    });
    component.printReportPdf();
    tick(200);
    expect(window.print).toHaveBeenCalled();
    expect(document.body.style.getPropertyValue('page')).toBe(previousPage);
  }));
  it('finds a product by batch number and filters unavailable stock', () => {
    product.batches = [batch('000123', '2031-07-01T00:00:00Z')];
    product.availableStock = 0;
    component.searchQuery = '000123';
    component.setTab('outOfStock');
    expect(component.filtered).toEqual([product]);
  });

  it('requires a reason before making a stock adjustment', () => {
    component.editCurrentQuantity = 10;
    component.adjustmentReason = '';
    component.saveEditBatch(batch('LOT', '2031-07-01T00:00:00Z'));
    expect(products.adjustStock).not.toHaveBeenCalled();
    expect(component.adjustmentError).toBeTruthy();
  });

});
