const prisma = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');

const VALID_ENTITIES = ['PERSONALIZADO', 'SESION', 'COMISION', 'SOCIO'];
const VALID_TYPES = ['TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'TIME', 'CURRENCY', 'BOOLEAN', 'SELECT'];

const listDefinitions = asyncHandler(async (req, res) => {
  const { entity, active } = req.query;
  const where = {};
  if (entity) {
    if (!VALID_ENTITIES.includes(entity)) throw new ApiError(400, `Entidad invalida: ${entity}`);
    where.entity = entity;
  }
  if (active === 'true') where.active = true;
  if (active === 'false') where.active = false;

  const defs = await prisma.fieldDefinition.findMany({ where, orderBy: [{ entity: 'asc' }, { order: 'asc' }] });
  sendSuccess(res, 200, defs);
});

const createDefinition = asyncHandler(async (req, res) => {
  const { entity, key, label, type, required, order, configuration } = req.body;
  if (!entity || !VALID_ENTITIES.includes(entity)) throw new ApiError(400, 'Entidad invalida.');
  if (!type || !VALID_TYPES.includes(type)) throw new ApiError(400, 'Tipo de campo invalido.');
  if (!key || !label) throw new ApiError(400, 'La clave (key) y la etiqueta (label) son obligatorias.');

  const def = await prisma.fieldDefinition.create({
    data: {
      entity,
      key: key.trim(),
      label,
      type,
      required: Boolean(required),
      order: order || 0,
      configuration: configuration || undefined,
    },
  });
  sendSuccess(res, 201, def);
});

const updateDefinition = asyncHandler(async (req, res) => {
  const { label, type, required, order, configuration } = req.body;
  const data = {};
  if (label !== undefined) data.label = label;
  if (type !== undefined) {
    if (!VALID_TYPES.includes(type)) throw new ApiError(400, 'Tipo de campo invalido.');
    data.type = type;
  }
  if (required !== undefined) data.required = Boolean(required);
  if (order !== undefined) data.order = order;
  if (configuration !== undefined) data.configuration = configuration;

  // No se elimina la clave (key) para no romper los valores historicos ya guardados.
  const def = await prisma.fieldDefinition.update({ where: { id: req.params.id }, data });
  sendSuccess(res, 200, def);
});

// Desactivar (no eliminar) preserva los FieldValue historicos asociados.
const setActive = asyncHandler(async (req, res) => {
  const { active } = req.body;
  const def = await prisma.fieldDefinition.update({ where: { id: req.params.id }, data: { active } });
  sendSuccess(res, 200, def);
});

const getValues = asyncHandler(async (req, res) => {
  const { entity, recordId } = req.params;
  if (!VALID_ENTITIES.includes(entity)) throw new ApiError(400, `Entidad invalida: ${entity}`);

  const definitions = await prisma.fieldDefinition.findMany({
    where: { entity, active: true },
    orderBy: { order: 'asc' },
  });
  const values = await prisma.fieldValue.findMany({
    where: { recordId, fieldDefinition: { entity } },
  });
  const valueMap = new Map(values.map((v) => [v.fieldDefinitionId, v.value]));

  const merged = definitions.map((def) => ({
    fieldDefinitionId: def.id,
    key: def.key,
    label: def.label,
    type: def.type,
    required: def.required,
    configuration: def.configuration,
    value: valueMap.get(def.id) ?? null,
  }));

  sendSuccess(res, 200, merged);
});

// Reemplaza (upsert) los valores de campos dinamicos de un registro.
// body: { values: [{ fieldDefinitionId, value }] }
const setValues = asyncHandler(async (req, res) => {
  const { entity, recordId } = req.params;
  const { values } = req.body;
  if (!VALID_ENTITIES.includes(entity)) throw new ApiError(400, `Entidad invalida: ${entity}`);
  if (!Array.isArray(values)) throw new ApiError(400, 'values debe ser un arreglo.');

  const definitions = await prisma.fieldDefinition.findMany({ where: { entity, active: true } });
  const validIds = new Set(definitions.map((d) => d.id));

  await prisma.$transaction(
    values
      .filter((v) => validIds.has(v.fieldDefinitionId))
      .map((v) =>
        prisma.fieldValue.upsert({
          where: { fieldDefinitionId_recordId: { fieldDefinitionId: v.fieldDefinitionId, recordId } },
          update: { value: v.value === null || v.value === undefined ? null : String(v.value), updatedById: req.user.id },
          create: {
            fieldDefinitionId: v.fieldDefinitionId,
            recordId,
            value: v.value === null || v.value === undefined ? null : String(v.value),
            updatedById: req.user.id,
          },
        })
      )
  );

  const updated = await prisma.fieldValue.findMany({ where: { recordId, fieldDefinition: { entity } } });
  sendSuccess(res, 200, updated);
});

module.exports = { listDefinitions, createDefinition, updateDefinition, setActive, getValues, setValues };
