const router = require('express').Router();
const createCrudController = require('../utils/crudFactory');
const { requireAuth, requireRole } = require('../middleware/auth');

const ctrl = createCrudController('socio', { searchFields: ['name', 'email', 'phone'] });

router.use(requireAuth);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', requireRole('ADMIN', 'COLABORADOR'), ctrl.create);
router.put('/:id', requireRole('ADMIN', 'COLABORADOR'), ctrl.update);
router.patch('/:id/active', requireRole('ADMIN'), ctrl.setActive);

module.exports = router;
