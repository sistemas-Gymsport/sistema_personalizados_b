const { computeGeneratedAmount, periodFromDate } = require('../commissionService');

describe('commissionService.computeGeneratedAmount', () => {
  test('valor por sesion * sesiones realizadas * porcentaje/100', () => {
    // Ejemplo del Excel de referencia: $250 * 70% = $175
    expect(computeGeneratedAmount(250, 1, 70)).toBe(175);
  });

  test('multiples sesiones realizadas', () => {
    expect(computeGeneratedAmount(150, 3, 30)).toBe(135);
  });

  test('cero sesiones realizadas genera comision cero', () => {
    expect(computeGeneratedAmount(250, 0, 70)).toBe(0);
  });

  test('cero por ciento genera comision cero', () => {
    expect(computeGeneratedAmount(250, 5, 0)).toBe(0);
  });

  test('redondea a 2 decimales', () => {
    expect(computeGeneratedAmount(99.99, 3, 33)).toBeCloseTo(98.99, 2);
  });

  test('acepta valores tipo Decimal de Prisma (string)', () => {
    expect(computeGeneratedAmount('150.00', '2', '30.00')).toBe(90);
  });
});

describe('commissionService.periodFromDate', () => {
  test('formatea como YYYY-MM', () => {
    expect(periodFromDate(new Date('2026-09-14'))).toBe('2026-09');
  });

  test('agrega cero a la izquierda en meses de un digito', () => {
    expect(periodFromDate(new Date('2026-01-05'))).toBe('2026-01');
  });

  test('usa la fecha actual si no se pasa argumento', () => {
    const result = periodFromDate();
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });
});
