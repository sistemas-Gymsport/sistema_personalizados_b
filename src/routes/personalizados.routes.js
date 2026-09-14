const router = require('express').Router();
const ctrl = require('../controllers/personalizados.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', requireRole('ADMIN', 'COLABORADOR'), ctrl.create);
router.put('/:id', requireRole('ADMIN', 'COLABORADOR'), ctrl.update);
router.delete('/:id', requireRole('ADMIN'), ctrl.deactivate);

module.exports = router;
