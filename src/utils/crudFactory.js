const prisma = require('../config/db');
const asyncHandler = require('./asyncHandler');
const { sendSuccess } = require('./sendResponse');
const ApiError = require('./ApiError');

// Fabrica de controladores CRUD para catalogos simples (Sucursal, Instructor,
// Paquete, Socio). Todos comparten el mismo patron: paginacion, busqueda por
// texto, activar/desactivar en lugar de borrado fisico.
function createCrudController(modelName, { searchFields = ['name'], orderBy = { name: 'asc' } } = {}) {
  const model = prisma[modelName];

  const list = asyncHandler(async (req, res) => {
    const { search, active, page = '1', pageSize = '20', all } = req.query;
    const where = {};
    if (active === 'true') where.active = true;
    if (active === 'false') where.active = false;
    if (search) {
      where.OR = searchFields.map((field) => ({
        [field]: { contains: search, mode: 'insensitive' },
      }));
    }

    if (all === 'true') {
      const items = await model.findMany({ where, orderBy });
      return sendSuccess(res, 200, items);
    }

    const take = Math.min(parseInt(pageSize, 10) || 20, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const [items, total] = await Promise.all([
      model.findMany({ where, orderBy, skip, take }),
      model.count({ where }),
    ]);

    sendSuccess(res, 200, items, { total, page: Number(page), pageSize: take });
  });

  const getById = asyncHandler(async (req, res) => {
    const item = await model.findUnique({ where: { id: req.params.id } });
    if (!item) throw new ApiError(404, 'Registro no encontrado.');
    sendSuccess(res, 200, item);
  });

  const create = asyncHandler(async (req, res) => {
    const item = await model.create({ data: req.body });
    sendSuccess(res, 201, item);
  });

  const update = asyncHandler(async (req, res) => {
    const item = await model.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, 200, item);
  });

  const setActive = asyncHandler(async (req, res) => {
    const { active } = req.body;
    if (typeof active !== 'boolean') throw new ApiError(400, 'El campo active debe ser booleano.');
    const item = await model.update({ where: { id: req.params.id }, data: { active } });
    sendSuccess(res, 200, item);
  });

  return { list, getById, create, update, setActive };
}

module.exports = createCrudController;
