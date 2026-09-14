const { computeTotal } = require('../pricingService');

describe('pricingService.computeTotal', () => {
  test('total = subtotal cuando no hay descuentos/recargos/cargos', () => {
    expect(computeTotal({ salePrice: 250 })).toBe(250);
  });

  test('resta el descuento', () => {
    expect(computeTotal({ salePrice: 250, descuento: 50 })).toBe(200);
  });

  test('suma recargos y cargo extra', () => {
    expect(computeTotal({ salePrice: 250, recargos: 20, cargoExtra: 10 })).toBe(280);
  });

  test('combina descuento, recargos y cargo extra en una sola operacion', () => {
    expect(computeTotal({ salePrice: 1000, descuento: 100, recargos: 50, cargoExtra: 25 })).toBe(975);
  });

  test('redondea a 2 decimales para evitar errores de punto flotante', () => {
    expect(computeTotal({ salePrice: 10.1, descuento: 0.05 })).toBe(10.05);
  });

  test('acepta valores tipo string (como llegan desde Decimal de Prisma)', () => {
    expect(computeTotal({ salePrice: '250.00', descuento: '0', recargos: '0', cargoExtra: '0' })).toBe(250);
  });
});
