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

  test('Excel realista: acentos, la letra Ñ, nombres/notas largas, celdas vacias, duplicados y varias sucursales', async () => {
    const notaLarga =
      'Cliente solicito reprogramar sus sesiones de la tercera semana por motivos de salud, ' +
      'se le otorgo una extension de 15 dias adicionales sin costo segun politica de la sucursal.';
    const buf = await bufferFromRows([
      ['Folio', 'Fecha de Venta', 'Hora', 'Sucursal', 'Nombre del Socio', 'Instructor', 'Precio de Venta', 'Notas'],
      ['PER-2001', new Date('2026-09-01'), '10:30:00', 'Geoplazas', 'Íñigo Muñoz Peña', 'María José Núñez', 899.5, notaLarga],
      ['PER-2002', new Date('2026-09-02'), '11:00:00', 'Toscana', 'José Ángel Domínguez Jiménez', 'Andrés Núñez', 499, null],
      ['PER-2003', new Date('2026-09-03'), '12:15:00', 'Lomas', 'Ma. Guadalupe Peña Ñáñez', '', 250, ''],
      // Folio duplicado a proposito: el sistema no debe deduplicar ni truena.
      ['PER-2001', new Date('2026-09-04'), '13:00:00', 'Satélite', 'Íñigo Muñoz Peña', 'María José Núñez', 899.5, ''],
    ]);

    const { columns, rows } = await parseWorkbook(buf);

    expect(rows).toHaveLength(4);

    // Acentos y Ñ se preservan tal cual (no se translitera el VALOR, solo la key).
    expect(rows[0].values.nombre_del_socio).toBe('Íñigo Muñoz Peña');
    expect(rows[1].values.nombre_del_socio).toBe('José Ángel Domínguez Jiménez');
    expect(rows[2].values.nombre_del_socio).toBe('Ma. Guadalupe Peña Ñáñez');

    // La columna "Sucursal" normaliza su KEY sin acentos, aunque el header
    // no tenga ninguno en este caso; se prueba con una columna que si los
    // tiene (Nombre del Socio) y con Ñ en un valor de columna.
    const sucursalCol = columns.find((c) => c.originalName === 'Sucursal');
    expect(sucursalCol.normalizedKey).toBe('sucursal');
    expect(rows.map((r) => r.values.sucursal)).toEqual(['Geoplazas', 'Toscana', 'Lomas', 'Satélite']);

    // Celdas vacias (null o cadena vacia) no rompen el parseo.
    expect(rows[1].values.notas).toBeNull();
    expect(rows[2].values.instructor).toBe('');

    // Nota larga se preserva completa (no se trunca).
    expect(rows[0].values.notas).toBe(notaLarga);
    expect(rows[0].values.notas.length).toBeGreaterThan(100);

    // Folio duplicado: ambas filas se conservan, cada una con sus propios
    // datos (no se colapsan ni se sobrescriben entre si).
    const per2001Rows = rows.filter((r) => r.values.folio === 'PER-2001');
    expect(per2001Rows).toHaveLength(2);
    expect(per2001Rows.map((r) => r.values.sucursal).sort()).toEqual(['Geoplazas', 'Satélite']);

    // Hora se detecta como texto (formato libre "HH:MM:SS"), no numero.
    const horaCol = columns.find((c) => c.originalName === 'Hora');
    expect(horaCol.detectedType).toBe('TEXT');

    // La columna de precio es una mezcla de enteros (499, 250) y un decimal
    // (899.5): sin signo de moneda, la heuristica NUMBER es la correcta;
    // forzar CURRENCY aqui daria falsos positivos en columnas numericas
    // comunes que no son dinero (ver detectType en datasetService.js).
    const precioCol = columns.find((c) => c.originalName === 'Precio de Venta');
    expect(precioCol.detectedType).toBe('NUMBER');
  });

  test('no depende de nombres de columna especificos: cabeceras en otro idioma/orden siguen funcionando', async () => {
    const buf = await bufferFromRows([
      ['Customer Name', 'Branch Office', 'Amount Due'],
      ['Coöperación Ñandú S.A.', 'Sucursal Norte', 1234.56],
    ]);
    const { columns, rows } = await parseWorkbook(buf);
    expect(columns.map((c) => c.normalizedKey)).toEqual(['customer_name', 'branch_office', 'amount_due']);
    expect(rows[0].values.customer_name).toBe('Coöperación Ñandú S.A.');
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
