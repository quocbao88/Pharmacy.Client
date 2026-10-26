import { OrdersComponent } from './orders.component';
import { OrderDto, OrderService } from '../../core/services/order.service';

describe('Order statistics', () => {
  it('uses charged revenue, keeps losses, counts base units and excludes cancelled orders', () => {
    const service = jasmine.createSpyObj<OrderService>('OrderService', ['getOrders']);
    const component = new OrdersComponent(service);
    const order: OrderDto = {
      id: 'order', orderCode: 'HD-1', userId: 'user', createdAt: '',
      totalAmount: 80, discountAmount: 20, paymentMethod: 'Cash', status: 'Completed',
      details: [{
        id: 'detail', productId: 'product', productName: 'Thuốc', unit: 'Viên',
        batchId: 'batch', batchNumber: 'LOT', quantity: 1, unitPrice: 100,
        costPrice: 90, subtotal: 100, soldUnit: 'Hộp', conversionValue: 10
      }]
    };
    component.orders = [order, { ...order, id: 'cancelled', status: 'Cancelled' }];
    component.calculateStats();
    expect(component.stats).toEqual({ revenue: 80, profit: -10, orderCount: 1, totalMedicines: 10 });
  });
});
