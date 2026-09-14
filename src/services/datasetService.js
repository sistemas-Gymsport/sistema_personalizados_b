const ExcelJS = require('exceljs');
const prisma = require('../config/db');

// Los datasets importados desde Excel viven 45 dias; pasado ese tiempo se
// eliminan por completo (ver deleteExpiredDatasets). Esto NUNCA afecta
// usuarios, sucursales, formatos guardados ni configuracion del sistema.
const EXPIRY_DAYS = 45;

function normalizeKey(name, index) {
  const base = String(name || `columna_${index + 1}`)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base || `columna_${index + 1}`;
}

// Convierte el valor de una celda de ExcelJS (que puede ser string, numero,
// Date, formula o texto enriquecido) a un texto plano guardable.
function cellToString(raw) {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date) return raw.toISOString();
  if (typeof raw === 'object') {
    if (raw.richText) return raw.richText.map((t) => t.text).join('');
    if ('result' in raw) return cellToString(raw.result);
    if (raw.text) return String(raw.text);
    return '';
  }
  return String(raw).trim();
}

// Heuristica simple para detectar el tipo de una columna a partir de una
// muestra de sus valores no vacios. Solo se usa para dar formato en la
// vista previa (ver frontend), nunca para validar datos obligatorios.
function detectType(sampleValues) {
  const values = sampleValues.filter((v) => v !== null && v !== '');
  if (values.length === 0) return 'TEXT';

  // Debe EMPEZAR con digitos en forma de fecha real (dd/mm/aaaa o
  // aaaa-mm-dd...); el Date.parse de V8 es demasiado permisivo por si solo
  // y aceptaria folios tipo "PER-1001" como si fueran una fecha valida.
  const isDate = (v) =>
    (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(v) || /^\d{4}-\d{1,2}-\d{1,2}/.test(v)) &&
    !Number.isNaN(Date.parse(v));
  const isCurrency = (v) => /^\$?\s*-?\d[\d,]*(\.\d+)?$/.test(v) && /[.,]/.test(v);
  const isNumber = (v) => /^-?\d+(\.\d+)?$/.test(v);

  if (values.every(isDate)) return 'DATE';
  if (values.every(isCurrency)) return 'CURRENCY';
  if (values.every(isNumber)) return 'NUMBER';
  return 'TEXT';
}

// Lee el buffer de un .xlsx/.xls y lo convierte en columnas + filas listas
// para guardarse. NO asume ninguna estructura fija: usa la primera fila con
// contenido como encabezados y detecta tantas columnas como existan.
async function parseWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('El archivo no tiene hojas con datos.');

  let headerRow = null;
  let headerRowNumber = 0;
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (headerRow) return;
    headerRow = row;
    headerRowNumber = rowNumber;
  });
  if (!headerRow) throw new Error('El archivo esta vacio.');

  const headerValues = headerRow.values; // 1-indexed, [0] vacio
  const columns = [];
  for (let col = 1; col < headerValues.length; col += 1) {
    const originalName = cellToString(headerValues[col]);
    if (!originalName) continue;
    columns.push({ originalName, order: columns.length, colIndex: col });
  }
  if (columns.length === 0) throw new Error('No se detectaron columnas (encabezados) en el archivo.');

  // Evita duplicar la clave normalizada si dos encabezados quedan iguales
  // (ej. dos columnas llamadas distinto pero que normalizan al mismo texto).
  const usedKeys = new Set();
  columns.forEach((c, i) => {
    let key = normalizeKey(c.originalName, i);
    let suffix = 2;
    while (usedKeys.has(key)) {
      key = `${normalizeKey(c.originalName, i)}_${suffix}`;
      suffix += 1;
    }
    usedKeys.add(key);
    c.normalizedKey = key;
  });

  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRowNumber) return;
    const values = {};
    let hasContent = false;
    for (const col of columns) {
      const raw = cellToString(row.values[col.colIndex]);
      values[col.normalizedKey] = raw;
      if (raw) hasContent = true;
    }
    if (hasContent) rows.push({ rowNumber: rows.length + 1, values });
  });

  for (const col of columns) {
    const sample = rows.slice(0, 25).map((r) => r.values[col.normalizedKey]);
    col.detectedType = detectType(sample);
  }

  return { columns, rows };
}

// Crea el Dataset completo (columnas + filas + valores) en una transaccion.
async function createDatasetFromExcel({ fileName, buffer, createdById }) {
  const { columns, rows } = await parseWorkbook(buffer);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  return prisma.$transaction(async (tx) => {
    const dataset = await tx.dataset.create({
      data: {
        fileName,
        rowCount: rows.length,
        columnCount: columns.length,
        expiresAt,
        createdById: createdById || null,
      },
    });

    await tx.datasetColumn.createMany({
      data: columns.map((c) => ({
        datasetId: dataset.id,
        originalName: c.originalName,
        normalizedKey: c.normalizedKey,
        detectedType: c.detectedType,
        order: c.order,
      })),
    });
    const savedColumns = await tx.datasetColumn.findMany({ where: { datasetId: dataset.id } });
    const columnIdByKey = new Map(savedColumns.map((c) => [c.normalizedKey, c.id]));

    // createMany en lotes para no exceder limites de una sola query cuando
    // el Excel tiene muchas filas/columnas (filas x columnas = valores).
    const BATCH_SIZE = 500;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const createdRows = await Promise.all(
        batch.map((r) => tx.datasetRow.create({ data: { datasetId: dataset.id, rowNumber: r.rowNumber } }))
      );
      const valuesData = [];
      batch.forEach((r, idx) => {
        const rowId = createdRows[idx].id;
        for (const col of columns) {
          valuesData.push({ rowId, columnId: columnIdByKey.get(col.normalizedKey), value: r.values[col.normalizedKey] });
        }
      });
      if (valuesData.length > 0) await tx.datasetValue.createMany({ data: valuesData });
    }

    return dataset;
  }, { timeout: 60000 });
}

// Borrado real de todo lo que ya expiro. Pensado para llamarse desde un
// endpoint protegido + scheduler externo (Render Cron Job / cron-job.org),
// y tambien de forma perezosa al listar datasets, para no depender
// unicamente de que alguien visite la pagina.
async function deleteExpiredDatasets() {
  const expired = await prisma.dataset.findMany({
    where: { expiresAt: { lt: new Date() } },
    select: { id: true, fileName: true },
  });
  if (expired.length === 0) return { deletedCount: 0, datasets: [] };

  await prisma.dataset.deleteMany({ where: { id: { in: expired.map((d) => d.id) } } });
  return { deletedCount: expired.length, datasets: expired };
}

function daysRemaining(expiresAt) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

module.exports = {
  EXPIRY_DAYS,
  parseWorkbook,
  createDatasetFromExcel,
  deleteExpiredDatasets,
  daysRemaining,
};
