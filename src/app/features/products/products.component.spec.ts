import { FormBuilder } from '@angular/forms';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProductsComponent } from './products.component';
import { AuthService } from '../../core/services/auth.service';
import { BatchDto, ProductDto, ProductService } from '../../core/services/product.service';
import { OrderService } from '../../core/services/order.service';

describe('Service medicine report batch columns', () => {
  let component: ProductsComponent;
  let products: jasmine.SpyObj<ProductService>;
  let auth: jasmine.SpyObj<AuthService>;
  let orders: jasmine.SpyObj<OrderService>;
  let product: ProductDto;

  function batch(number: string, expiration: string): BatchDto {
    return {
      id: number, productId: 'product', batchNumber: number,
      expirationDate: expiration, currentQuantity: 0
    };
  }

  beforeEach(() => {
    products = jasmine.createSpyObj<ProductService>('ProductService', ['getAll', 'getAlerts']);
    products.getAlerts.and.returnValue(of({ lowStockProducts: [], expiringBatches: [] }));
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['isAdmin']);
    auth.isAdmin.and.returnValue(true);
    orders = jasmine.createSpyObj<OrderService>('OrderService', ['getOrders']);
    orders.getOrders.and.returnValue(of([]));
    component = new ProductsComponent(new FormBuilder(), products, auth, orders);
    product = {
      id: 'product', supplierId: 'supplier', name: 'Bơm 10ml', unit: 'Cái',
      importPrice: 1200, sellingPrice: 3000, minStockLevel: 5,
      totalStock: 47, updatedAt: '', prescriptionRequired: false
    };
    component.products = [product];
    component.reportStartDate = '2026-07-01';
    component.reportEndDate = '2026-07-31';
    component.reportFormat = 'csv';
  });

  it('adds batch number and Vietnamese expiry date without changing totals', () => {
    product.batches = [batch('090526', '2031-09-06T00:00:00Z')];
    spyOn(component, 'downloadReportCsv');
    component.generateReportData();
    expect(component.reportItems[0].batchNumber).toBe('090526');
    expect(component.reportItems[0].expirationDate).toBe('06/09/2031');
    expect(component.reportItems[0].tonCuoi).toBe(47);
    expect(component.totalReportValues.totalStockPrice).toBe(47 * 1200);
  });

  it('keeps every batch paired with its date, including batches with no stock', () => {
    const later = batch('SECOND', '2032-08-31T00:00:00Z');
    const earlier = batch('FIRST', '2031-07-01T00:00:00Z');
    product.batches = [later, earlier];
    spyOn(component, 'downloadReportCsv');
    component.generateReportData();
    expect(component.reportItems.length).toBe(1);
    expect(component.reportItems[0].batchNumber).toBe('FIRST\nSECOND');
    expect(component.reportItems[0].expirationDate).toBe('01/07/2031\n31/08/2032');
    expect(product.batches).toEqual([later, earlier]);
  });

  it('shows missing batch data explicitly', () => {
    spyOn(component, 'downloadReportCsv');
    component.generateReportData();
    expect(component.reportItems[0].batchNumber).toBe('—');
    expect(component.reportItems[0].expirationDate).toBe('—');
  });

  it('formats expiry in the same local calendar as the existing batch screen', () => {
    const localMidnight = new Date(2031, 6, 2, 0, 0, 0).toISOString();
    product.batches = [batch('LOT', localMidnight)];
    spyOn(component, 'downloadReportCsv');
    component.generateReportData();
    expect(component.reportItems[0].expirationDate).toBe('02/07/2031');
  });

  it('exports quoted batch values and keeps totals in the correct CSV columns', async () => {
    product.batches = [batch('000123', '2031-07-01T00:00:00Z')];
    let output = new Blob();
    spyOn(URL, 'createObjectURL').and.callFake(blob => {
      output = blob as Blob;
      return 'blob:report-test';
    });
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click');
    component.generateReportData();
    const csv = await output.text();
    const header = csv.split('\n')[0].replace('\uFEFF', '').split(',');
    const totalLine = csv.trimEnd().split('\n').pop() || '';
    const totals = totalLine.split(',').map(value => value.slice(1, -1));
    expect(header.slice(0, 5)).toEqual(['STT', 'Tên thuốc - hàm lượng', 'Số lô', 'Hạn sử dụng', 'ĐVT']);
    expect(csv).toContain('"000123","01/07/2031"');
    expect(totals.length).toBe(header.length);
    expect(totals[header.indexOf('Tiền tồn')]).toBe(String(47 * 1200));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:report-test');
  });

  it('renders both print columns and aligns the total row', async () => {
    products.getAll.and.returnValue(of([product]));
    await TestBed.configureTestingModule({
      imports: [ProductsComponent],
      providers: [
        { provide: ProductService, useValue: products },
        { provide: AuthService, useValue: auth },
        { provide: OrderService, useValue: orders }
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
    expect(cells[2].textContent).toContain('000123');
    expect(cells[3].textContent).toContain('01/07/2031');
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
});
