import { fakeAsync, tick } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { CheckoutComponent } from './checkout.component';
import { ProductDto, ProductService } from '../../core/services/product.service';
import { CustomerService } from '../../core/services/customer.service';
import { OrderDto, OrderService } from '../../core/services/order.service';

describe('POS checkout', () => {
  let component: CheckoutComponent;
  let products: jasmine.SpyObj<ProductService>;
  let orders: jasmine.SpyObj<OrderService>;
  let product: ProductDto;

  beforeEach(() => {
    products = jasmine.createSpyObj<ProductService>('ProductService', ['getAll']);
    const customers = jasmine.createSpyObj<CustomerService>('CustomerService', ['getAll']);
    customers.getAll.and.returnValue(of([]));
    orders = jasmine.createSpyObj<OrderService>('OrderService', ['checkout']);
    component = new CheckoutComponent(products, customers, orders);
    product = {
      id: 'product-1', supplierId: 'supplier-1', name: 'Thuốc', unit: 'Viên',
      importPrice: 50, sellingPrice: 100, minStockLevel: 1, totalStock: 5,
      updatedAt: '', prescriptionRequired: false,
      unitConversions: [{ id: 'box', unitName: 'Hộp', conversionValue: 10, sellingPrice: 900 }]
    };
  });

  afterEach(() => component.ngOnDestroy());

  it('continues searching after an HTTP error', fakeAsync(() => {
    products.getAll.and.returnValues(throwError(() => new Error('offline')), of([product]));
    component.ngOnInit();
    component.onSearchInput({ target: { value: 'first' } } as unknown as Event);
    tick(300);
    expect(component.searchResults).toEqual([]);
    component.onSearchInput({ target: { value: 'second' } } as unknown as Event);
    tick(300);
    expect(component.searchResults).toEqual([product]);
  }));

  it('prevents choosing a box larger than available stock', () => {
    spyOn(window, 'alert');
    component.addToCart(product);
    component.changeUnit(component.cart[0], 'Hộp');
    expect(component.cart[0].selectedUnit).toBe('Viên');
    expect(component.cart[0].conversionValue).toBe(1);
  });

  it('rejects fractional quantities before making a checkout request', () => {
    component.addToCart(product);
    component.cart[0].quantity = 1.5;
    component.processCheckout();
    expect(orders.checkout).not.toHaveBeenCalled();
    expect(component.checkoutError).toBeTruthy();
  });

  it('submits only once while checkout is pending', () => {
    orders.checkout.and.returnValue(new Subject<OrderDto>());
    component.addToCart(product);
    component.processCheckout();
    component.processCheckout();
    expect(orders.checkout).toHaveBeenCalledTimes(1);
  });

  it('clamps discounts after removing an item', () => {
    component.addToCart(product);
    component.discountAmount = 100;
    component.removeFromCart(component.cart[0]);
    expect(component.discountAmount).toBe(0);
  });
  it('does not add expired-only stock to the cart', () => {
    product.totalStock = 10;
    product.availableStock = 0;
    component.addToCart(product);
    expect(component.cart).toEqual([]);
  });

});
