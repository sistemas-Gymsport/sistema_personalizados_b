const router = require('express').Router();
const createCrudController = require('../utils/crudFactory');
const { requireAuth, requireRole } = require('../middleware/auth');

const ctrl = createCrudController('sucursal', { searchFields: ['name', 'address'] });

router.use(requireAuth);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', requireRole('ADMIN'), ctrl.create);
router.put('/:id', requireRole('ADMIN'), ctrl.update);
router.patch('/:id/active', requireRole('ADMIN'), ctrl.setActive);

module.exports = router;
