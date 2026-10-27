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
  it('finds orders by guest name and status', () => {
    const service = jasmine.createSpyObj<OrderService>('OrderService', ['getOrders']);
    const component = new OrdersComponent(service);
    component.orders = [
      { id: '1', orderCode: 'HD-01', guestName: 'Nguyễn An', status: 'Completed', details: [] } as unknown as OrderDto,
      { id: '2', orderCode: 'HD-02', guestName: 'Nguyễn An', status: 'Returned', details: [] } as unknown as OrderDto
    ];
    component.searchQuery = 'nguyễn';
    component.statusFilter = 'Returned';
    expect(component.visibleOrders.map(order => order.id)).toEqual(['2']);
  });

  it('does not submit an excessive return quantity', () => {
    const service = jasmine.createSpyObj<OrderService>('OrderService', ['returnOrder']);
    const component = new OrdersComponent(service);
    const order = { id: 'order', status: 'Completed', details: [
      { id: 'line', quantity: 2, returnedQuantity: 1 }
    ] } as unknown as OrderDto;
    component.openReturn(order);
    component.actionReason = 'Khách trả hàng';
    component.returnLines[0].quantity = 2;
    component.submitAction();
    expect(service.returnOrder).not.toHaveBeenCalled();
    expect(component.actionError).toBeTruthy();
  });

  it('does not submit cancellation without a meaningful reason', () => {
    const service = jasmine.createSpyObj<OrderService>('OrderService', ['cancelOrder']);
    const component = new OrdersComponent(service);
    component.cancelOrder({ id: 'order', status: 'Completed', details: [] } as unknown as OrderDto);
    component.submitAction();
    expect(service.cancelOrder).not.toHaveBeenCalled();
    expect(component.actionError).toBeTruthy();
  });

});
