const ExcelJS = require('exceljs');
const { parseWorkbook, daysRemaining, EXPIRY_DAYS } = require('../datasetService');

async function bufferFromRows(rows) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Hoja1');
  rows.forEach((r) => ws.addRow(r));
  return wb.xlsx.writeBuffer();
}

describe('datasetService.parseWorkbook', () => {
  test('detecta columnas y filas de un archivo valido (columnas del Excel de referencia)', async () => {
    const buf = await bufferFromRows([
      ['Folio', 'Fecha de Venta', 'Sucursal', 'Nombre del Socio', 'Precio de Venta'],
      ['PER-1001', new Date('2026-08-01'), 'Geoplazas', 'Ximena Hurtado', 899],
      ['PER-1002', new Date('2026-08-03'), 'Toscana', 'Juan Perez', 499],
    ]);
    const { columns, rows } = await parseWorkbook(buf);

    expect(columns.map((c) => c.originalName)).toEqual([
      'Folio',
      'Fecha de Venta',
      'Sucursal',
      'Nombre del Socio',
      'Precio de Venta',
    ]);
    expect(columns.map((c) => c.normalizedKey)).toEqual([
      'folio',
      'fecha_de_venta',
      'sucursal',
      'nombre_del_socio',
      'precio_de_venta',
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].values.folio).toBe('PER-1001');
    expect(rows[0].values.nombre_del_socio).toBe('Ximena Hurtado');
  });

  test('funciona con un Excel totalmente distinto (otras columnas)', async () => {
    const buf = await bufferFromRows([
      ['Cliente', 'ID', 'Total'],
      ['Maria Lopez', 42, 100],
    ]);
    const { columns, rows } = await parseWorkbook(buf);
    expect(columns).toHaveLength(3);
    expect(rows[0].values).toEqual({ cliente: 'Maria Lopez', id: '42', total: '100' });
  });

  test('detecta numeros correctamente', async () => {
    const buf = await bufferFromRows([
      ['Sesiones Contratadas'],
      [8],
      [4],
      [1],
    ]);
    const { columns } = await parseWorkbook(buf);
    expect(columns[0].detectedType).toBe('NUMBER');
  });

  test('detecta fechas correctamente y no confunde folios con fechas', async () => {
    const buf = await bufferFromRows([
      ['Folio', 'Fecha de Venta'],
      ['PER-1001', new Date('2026-08-01')],
      ['PER-1002', new Date('2026-08-03')],
    ]);
    const { columns } = await parseWorkbook(buf);
    const folioCol = columns.find((c) => c.normalizedKey === 'folio');
    const fechaCol = columns.find((c) => c.normalizedKey === 'fecha_de_venta');
    expect(folioCol.detectedType).toBe('TEXT');
    expect(fechaCol.detectedType).toBe('DATE');
  });

  test('detecta moneda cuando los valores traen decimales', async () => {
    const buf = await bufferFromRows([
      ['Precio'],
      ['899.00'],
      ['499.50'],
    ]);
    const { columns } = await parseWorkbook(buf);
    expect(columns[0].detectedType).toBe('CURRENCY');
  });

  test('columnas con encabezados duplicados no colisionan en normalizedKey', async () => {
    const buf = await bufferFromRows([
      ['Nombre', 'Nombre'],
      ['A', 'B'],
    ]);
    const { columns } = await parseWorkbook(buf);
    const keys = columns.map((c) => c.normalizedKey);
    expect(new Set(keys).size).toBe(2);
  });

  test('valores vacios en una fila no rompen el parseo', async () => {
    const buf = await bufferFromRows([
      ['Folio', 'Notas'],
      ['PER-1001', null],
      ['PER-1002', 'Con nota'],
    ]);
    const { rows } = await parseWorkbook(buf);
    expect(rows).toHaveLength(2);
    expect(rows[0].values.notas).toBeNull();
    expect(rows[1].values.notas).toBe('Con nota');
  });

  test('archivo sin filas de datos (solo encabezados) produce 0 filas, no error', async () => {
    const buf = await bufferFromRows([['Folio', 'Sucursal']]);
    const { rows, columns } = await parseWorkbook(buf);
    expect(columns).toHaveLength(2);
    expect(rows).toHaveLength(0);
  });

  test('archivo completamente vacio lanza un error entendible', async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Vacia');
    const buf = await wb.xlsx.writeBuffer();
    await expect(parseWorkbook(buf)).rejects.toThrow(/vacio/i);
  });
});

describe('datasetService.daysRemaining / EXPIRY_DAYS', () => {
  test('el dataset expira a los 45 dias', () => {
    expect(EXPIRY_DAYS).toBe(45);
  });

  test('calcula dias restantes hasta la fecha de expiracion', () => {
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    expect(daysRemaining(future)).toBeGreaterThanOrEqual(9);
    expect(daysRemaining(future)).toBeLessThanOrEqual(10);
  });

  test('una fecha en el pasado da dias restantes negativos o cero (expirado)', () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(daysRemaining(past)).toBeLessThanOrEqual(0);
  });
});
